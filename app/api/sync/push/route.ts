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
import { softDeleteVaultItem, upsertVaultItemFromSync } from "@/server/repositories/vault-items"

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

const SYNC_TABLES = ["financialAccounts", "expenseCategories", "transactions", "budgets", "vaultItems"] as const

const operationEnvelopeSchema = z.object({
  operations: z
    .array(
      z.object({
        table: z.enum(SYNC_TABLES),
        op: z.enum(["upsert", "delete"]),
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
      case "budgets": {
        const values = budgetDataSchema.parse(op.data)
        const row = await upsertBudgetFromSync(userId, op.id, values, clientUpdatedAt)
        return { id: op.id, table: op.table, status: row ? "applied" : "skipped" }
      }
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
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = operationEnvelopeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const results: ApplyResult[] = []
  for (const op of parsed.data.operations) {
    results.push(await applyOperation(auth.userId, op))
  }

  return NextResponse.json({ results })
}
