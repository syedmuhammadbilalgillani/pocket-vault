import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireBearerUser } from "@/lib/auth/require-bearer-user"
import {
  deleteFinancialAccount,
  upsertFinancialAccountFromSync,
} from "@/server/repositories/financial-accounts"
import {
  deleteExpenseCategory,
  upsertExpenseCategoryFromSync,
} from "@/server/repositories/expense-categories"
import { softDeleteTransaction, upsertTransactionFromSync } from "@/server/repositories/transactions"
import { deleteBudget, upsertBudgetFromSync } from "@/server/repositories/budgets"
import {
  restoreVaultItem,
  softDeleteVaultItem,
  upsertVaultItemFromSync,
} from "@/server/repositories/vault-items"
import { upsertVaultCategoryFromSync } from "@/server/repositories/vault-categories"
import { deleteRecurringRule, upsertRecurringRuleFromSync } from "@/server/repositories/recurring-rules"
import { markNotificationRead } from "@/server/repositories/notifications"
import { corsPreflight, withCors } from "@/lib/cors"

export function OPTIONS() {
  return corsPreflight()
}

// Applies a batch of client-originated mutations from the native-app's
// sync_outbox. Additive to the existing web Server Actions — this is the
// only entry point that writes via the *FromSync repository functions
// (upsert-by-client-id, last-write-wins; see the matching comments in
// server/repositories/financial-accounts.ts). Operations run sequentially,
// in the order the client sent them, so a batch that (say) creates an
// account and then a transaction referencing it applies safely in order.
//
// vaultItems (Phase 2) is the one table here whose "upsert" payload is
// plaintext credential fields rather than already-encrypted columns — see
// upsertVaultItemFromSync, which encrypts server-side with the normal
// KEK/DEK envelope (ADR-001), same as the web Server Action path.

const SYNC_TABLES = [
  "financialAccounts",
  "expenseCategories",
  "transactions",
  "budgets",
  "vaultItems",
  "vaultCategories",
  "recurringRules",
  "notifications",
] as const

const operationEnvelopeSchema = z.object({
  operations: z
    .array(
      z.object({
        table: z.enum(SYNC_TABLES),
        // "restore" only means anything for vaultItems (trash/restore);
        // "markRead" only for notifications. Every other table/op
        // combination just no-ops (see the switch statements below).
        op: z.enum(["upsert", "delete", "restore", "markRead"]),
        id: z.string().uuid(),
        clientUpdatedAt: z.string().datetime(),
        data: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .max(500),
})

const financialAccountDataSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["cash", "bank", "credit_card", "digital_wallet", "other"]),
  currency: z.string().length(3),
  openingBalanceMinor: z.number().int(),
  isArchived: z.boolean(),
})

const expenseCategoryDataSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).nullable().optional(),
  isSystem: z.boolean().optional().default(false),
})

const transactionDataSchema = z.object({
  type: z.enum(["expense", "income", "refund", "transfer"]),
  amountMinor: z.number().int(),
  currency: z.string().length(3),
  categoryId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  merchant: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum([
    "cash",
    "debit_card",
    "credit_card",
    "bank_transfer",
    "digital_wallet",
    "other",
  ]),
  tags: z.array(z.string()).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  recurringRuleId: z.string().uuid().nullable().optional(),
})

const vaultItemDataSchema = z.object({
  title: z.string().min(1).max(200),
  categoryId: z.string().uuid().nullable().optional(),
  isFavorite: z.boolean().optional().default(false),
  passwordChangedAt: z.string().datetime().nullable().optional(),
  username: z.string().max(500).nullable().optional(),
  password: z.string().max(500).nullable().optional(),
  website: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

const vaultCategoryDataSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).nullable().optional(),
})

const recurringRuleDataSchema = z.object({
  transactionType: z.enum(["expense", "income", "refund", "transfer"]),
  amountMinor: z.number().int(),
  currency: z.string().length(3),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]),
  interval: z.number().int().min(1).optional().default(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nextRunAt: z.string().datetime(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isActive: z.boolean().optional().default(true),
})

const budgetDataSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  limitMinor: z.number().int(),
  currency: z.string().length(3).optional().default("USD"),
  alertThresholdPercent: z.number().int().min(1).max(100).optional().default(80),
  rolloverEnabled: z.boolean().optional().default(false),
})

type Operation = z.infer<typeof operationEnvelopeSchema>["operations"][number]
type ApplyResult = { id: string; table: string; status: "applied" | "skipped" | "error"; error?: string }

async function applyOperation(userId: string, op: Operation): Promise<ApplyResult> {
  try {
    if (op.op === "markRead") {
      if (op.table !== "notifications") {
        return { id: op.id, table: op.table, status: "skipped" }
      }
      await markNotificationRead(userId, op.id)
      return { id: op.id, table: op.table, status: "applied" }
    }

    if (op.op === "restore") {
      if (op.table !== "vaultItems") {
        return { id: op.id, table: op.table, status: "skipped" }
      }
      await restoreVaultItem(userId, op.id)
      return { id: op.id, table: op.table, status: "applied" }
    }

    if (op.op === "delete") {
      switch (op.table) {
        case "financialAccounts":
          await deleteFinancialAccount(userId, op.id)
          break
        case "expenseCategories":
          await deleteExpenseCategory(userId, op.id)
          break
        case "transactions":
          await softDeleteTransaction(userId, op.id)
          break
        case "budgets":
          await deleteBudget(userId, op.id)
          break
        case "vaultItems":
          await softDeleteVaultItem(userId, op.id)
          break
        case "recurringRules":
          await deleteRecurringRule(userId, op.id)
          break
        case "vaultCategories":
        case "notifications":
          // No client-initiated delete path for either — vault categories
          // are never removed (see listVaultCategoriesChangedSince), and
          // notifications are server-authored (see listNotificationsChangedSince).
          break
      }
      return { id: op.id, table: op.table, status: "applied" }
    }

    const clientUpdatedAt = new Date(op.clientUpdatedAt)

    switch (op.table) {
      case "financialAccounts": {
        const values = financialAccountDataSchema.parse(op.data)
        const row = await upsertFinancialAccountFromSync(userId, op.id, values, clientUpdatedAt)
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
      case "expenseCategories": {
        const values = expenseCategoryDataSchema.parse(op.data)
        const row = await upsertExpenseCategoryFromSync(userId, op.id, values, clientUpdatedAt)
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
      case "transactions": {
        const values = transactionDataSchema.parse(op.data)
        const row = await upsertTransactionFromSync(userId, op.id, values, clientUpdatedAt)
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
      case "vaultCategories": {
        const values = vaultCategoryDataSchema.parse(op.data)
        const row = await upsertVaultCategoryFromSync(userId, op.id, { name: values.name, icon: values.icon ?? null }, clientUpdatedAt)
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
      case "budgets": {
        const values = budgetDataSchema.parse(op.data)
        const row = await upsertBudgetFromSync(userId, op.id, values, clientUpdatedAt)
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
      case "recurringRules": {
        const values = recurringRuleDataSchema.parse(op.data)
        const row = await upsertRecurringRuleFromSync(
          userId,
          op.id,
          {
            transactionType: values.transactionType,
            amountMinor: values.amountMinor,
            currency: values.currency,
            categoryId: values.categoryId ?? null,
            description: values.description ?? null,
            frequency: values.frequency,
            interval: values.interval ?? 1,
            startDate: values.startDate,
            nextRunAt: new Date(values.nextRunAt),
            endDate: values.endDate ?? null,
            isActive: values.isActive ?? true,
          },
          clientUpdatedAt,
        )
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
      case "notifications":
        // No client-initiated upsert path — see the delete-switch comment
        // above. An "upsert" op reaching here for this table is a client
        // bug, not a real state to apply.
        return { id: op.id, table: op.table, status: "skipped" }
      case "vaultItems": {
        const values = vaultItemDataSchema.parse(op.data)
        const row = await upsertVaultItemFromSync(
          userId,
          op.id,
          {
            title: values.title,
            categoryId: values.categoryId ?? null,
            isFavorite: values.isFavorite ?? false,
            passwordChangedAt: values.passwordChangedAt ? new Date(values.passwordChangedAt) : null,
          },
          {
            username: values.username ?? undefined,
            password: values.password ?? undefined,
            website: values.website ?? undefined,
            notes: values.notes ?? undefined,
          },
          clientUpdatedAt,
        )
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
    }
  } catch (error) {
    return {
      id: op.id,
      table: op.table,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireBearerUser(request)
  if (!auth.ok) {
    return withCors(NextResponse.json({ error: auth.message }, { status: auth.status }))
  }

  const body = await request.json().catch(() => null)
  const parsed = operationEnvelopeSchema.safeParse(body)
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Invalid request" }, { status: 400 }))
  }

  const results: ApplyResult[] = []
  for (const op of parsed.data.operations) {
    results.push(await applyOperation(auth.userId, op))
  }

  return withCors(NextResponse.json({ results }))
}
