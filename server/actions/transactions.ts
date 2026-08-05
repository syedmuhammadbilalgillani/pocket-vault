"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { parseAmountToMinor } from "@/lib/money";
import { logAuditEvent } from "@/lib/auth/audit";
import {
  insertTransaction,
  updateTransactionRow,
  softDeleteTransaction as softDeleteTransactionRow,
  getTransaction,
} from "@/server/repositories/transactions";

const transactionSchema = z.object({
  type: z.enum(["expense", "income", "refund", "transfer"]),
  amount: z
    .string()
    .refine((v) => parseAmountToMinor(v) !== null, "Enter a valid amount"),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  merchant: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  paymentMethod: z.enum([
    "cash",
    "debit_card",
    "credit_card",
    "bank_transfer",
    "digital_wallet",
    "other",
  ]),
  notes: z.string().max(2000).optional().or(z.literal("")),
  tags: z.string().optional(),
});

export type TransactionFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

function readFormFields(formData: FormData) {
  return transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId") || undefined,
    merchant: formData.get("merchant") || undefined,
    description: formData.get("description") || undefined,
    transactionDate: formData.get("transactionDate"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
    tags: formData.get("tags") || undefined,
  });
}

function parseTags(raw?: string): string[] | null {
  if (!raw) return null;
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length ? tags : null;
}

export async function createTransaction(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const user = await requireUser();
  const parsed = readFormFields(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const amountMinor = parseAmountToMinor(parsed.data.amount)!;

  await insertTransaction(user.id, {
    type: parsed.data.type,
    amountMinor,
    categoryId: parsed.data.categoryId || null,
    merchant: parsed.data.merchant || null,
    description: parsed.data.description || null,
    transactionDate: parsed.data.transactionDate,
    paymentMethod: parsed.data.paymentMethod,
    notes: parsed.data.notes || null,
    tags: parseTags(parsed.data.tags),
  });

  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  revalidatePath("/expenses");
  return { status: "success" };
}

export async function updateTransaction(
  id: string,
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const user = await requireUser();
  const parsed = readFormFields(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const amountMinor = parseAmountToMinor(parsed.data.amount)!;

  const updated = await updateTransactionRow(user.id, id, {
    type: parsed.data.type,
    amountMinor,
    categoryId: parsed.data.categoryId || null,
    merchant: parsed.data.merchant || null,
    description: parsed.data.description || null,
    transactionDate: parsed.data.transactionDate,
    paymentMethod: parsed.data.paymentMethod,
    notes: parsed.data.notes || null,
    tags: parseTags(parsed.data.tags),
  });

  if (!updated) return { status: "error", message: "Transaction not found" };

  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}`);
  return { status: "success" };
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  await softDeleteTransactionRow(user.id, id);
  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  revalidatePath("/expenses");
}

export async function duplicateTransaction(id: string) {
  const user = await requireUser();
  const existing = await getTransaction(user.id, id);
  if (!existing) throw new Error("Transaction not found");

  const copy = await insertTransaction(user.id, {
    type: existing.type,
    amountMinor: existing.amountMinor,
    currency: existing.currency,
    categoryId: existing.categoryId,
    accountId: existing.accountId,
    merchant: existing.merchant,
    description: existing.description,
    transactionDate: new Date().toISOString().slice(0, 10),
    paymentMethod: existing.paymentMethod,
    tags: existing.tags,
    notes: existing.notes,
  });

  await logAuditEvent({ userId: user.id, eventType: "transaction.duplicated" });
  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  revalidatePath("/expenses");
  return copy.id;
}
