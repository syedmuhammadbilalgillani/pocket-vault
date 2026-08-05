"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth/require-user"
import { parseAmountToMinor } from "@/lib/money"
import {
  insertFinancialAccount,
  updateFinancialAccountRow,
  archiveFinancialAccount,
  deleteFinancialAccount as deleteFinancialAccountRow,
  getFinancialAccount,
} from "@/server/repositories/financial-accounts"
import { insertTransaction } from "@/server/repositories/transactions"

const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["cash", "bank", "credit_card", "digital_wallet", "other"]),
  openingBalance: z.string().refine((v) => v === "" || parseAmountToMinor(v) !== null, "Enter a valid amount"),
})

export type AccountFormState = { status: "idle" | "error" | "success"; message?: string }

export async function createFinancialAccount(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser()
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    openingBalance: formData.get("openingBalance") || "0",
  })

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  await insertFinancialAccount(user.id, {
    name: parsed.data.name,
    type: parsed.data.type,
    openingBalanceMinor: parseAmountToMinor(parsed.data.openingBalance || "0") ?? 0,
  })

  revalidatePath("/settings/accounts")
  return { status: "success" }
}

export async function updateFinancialAccount(
  id: string,
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { status: "error", message: "Name is required" }

  const updated = await updateFinancialAccountRow(user.id, id, { name })
  if (!updated) return { status: "error", message: "Account not found" }

  revalidatePath("/settings/accounts")
  return { status: "success" }
}

export async function archiveFinancialAccountAction(id: string) {
  const user = await requireUser()
  await archiveFinancialAccount(user.id, id)
  revalidatePath("/settings/accounts")
}

export async function deleteFinancialAccountAction(id: string) {
  const user = await requireUser()
  await deleteFinancialAccountRow(user.id, id)
  revalidatePath("/settings/accounts")
}

const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.string().refine((v) => parseAmountToMinor(v) !== null, "Enter a valid amount"),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().or(z.literal("")),
})

export type TransferFormState = { status: "idle" | "error" | "success"; message?: string }

// Modeled as two linked rows rather than a schema change: a negative
// amountMinor debits the source account, a positive one credits the
// destination — both type "transfer", which is already excluded from the
// income/expense totals everywhere else (getMonthlyTotals doesn't sum
// "transfer"), so moving money between your own accounts correctly
// doesn't affect your overall income/expense picture. See
// getAccountBalance() in the repository for how these are summed back up.
export async function transferBetweenAccounts(
  _prevState: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  const user = await requireUser()
  const parsed = transferSchema.safeParse({
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    amount: formData.get("amount"),
    transactionDate: formData.get("transactionDate"),
    notes: formData.get("notes") || undefined,
  })

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  if (parsed.data.fromAccountId === parsed.data.toAccountId) {
    return { status: "error", message: "Choose two different accounts" }
  }

  const [fromAccount, toAccount] = await Promise.all([
    getFinancialAccount(user.id, parsed.data.fromAccountId),
    getFinancialAccount(user.id, parsed.data.toAccountId),
  ])
  if (!fromAccount || !toAccount) {
    return { status: "error", message: "Account not found" }
  }

  const amountMinor = parseAmountToMinor(parsed.data.amount)!
  const description = `Transfer: ${fromAccount.name} → ${toAccount.name}`

  await Promise.all([
    insertTransaction(user.id, {
      type: "transfer",
      amountMinor: -amountMinor,
      accountId: fromAccount.id,
      description,
      transactionDate: parsed.data.transactionDate,
      paymentMethod: "other",
      notes: parsed.data.notes || null,
    }),
    insertTransaction(user.id, {
      type: "transfer",
      amountMinor,
      accountId: toAccount.id,
      description,
      transactionDate: parsed.data.transactionDate,
      paymentMethod: "other",
      notes: parsed.data.notes || null,
    }),
  ])

  revalidatePath("/settings/accounts")
  revalidatePath("/expenses")
  return { status: "success" }
}
