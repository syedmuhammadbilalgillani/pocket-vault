"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { parseAmountToMinor } from "@/lib/money";
import {
  insertRecurringRule,
  updateRecurringRule,
  deleteRecurringRule as deleteRecurringRuleRow,
  getRecurringRule,
} from "@/server/repositories/recurring-rules";

const ruleSchema = z.object({
  transactionType: z.enum(["expense", "income", "refund", "transfer"]),
  amount: z
    .string()
    .refine((v) => parseAmountToMinor(v) !== null, "Enter a valid amount"),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().max(200).optional().or(z.literal("")),
  frequency: z.enum([
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
    "custom",
  ]),
  interval: z.coerce.number().int().min(1).max(365).default(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export type RecurringRuleFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

function readFormFields(formData: FormData) {
  return ruleSchema.safeParse({
    transactionType: formData.get("transactionType"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId") || undefined,
    description: formData.get("description") || undefined,
    frequency: formData.get("frequency"),
    interval: formData.get("interval") || 1,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
  });
}

export async function createRecurringRule(
  _prevState: RecurringRuleFormState,
  formData: FormData,
): Promise<RecurringRuleFormState> {
  const user = await requireUser();
  const parsed = readFormFields(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await insertRecurringRule(user.id, {
    transactionType: parsed.data.transactionType,
    amountMinor: parseAmountToMinor(parsed.data.amount)!,
    categoryId: parsed.data.categoryId || null,
    description: parsed.data.description || null,
    frequency: parsed.data.frequency,
    interval: parsed.data.interval,
    startDate: parsed.data.startDate,
    // First occurrence is the start date itself; the cron job advances
    // this forward each time it generates that occurrence's transaction.
    nextRunAt: new Date(`${parsed.data.startDate}T00:00:00.000Z`),
    endDate: parsed.data.endDate || null,
    isActive: true,
  });

  revalidateTag("vault-module-recurring-rules", "max");
  revalidatePath("/subscriptions");
  return { status: "success" };
}

export async function updateRecurringRuleAction(
  id: string,
  _prevState: RecurringRuleFormState,
  formData: FormData,
): Promise<RecurringRuleFormState> {
  const user = await requireUser();
  const parsed = readFormFields(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const updated = await updateRecurringRule(user.id, id, {
    transactionType: parsed.data.transactionType,
    amountMinor: parseAmountToMinor(parsed.data.amount)!,
    categoryId: parsed.data.categoryId || null,
    description: parsed.data.description || null,
    frequency: parsed.data.frequency,
    interval: parsed.data.interval,
    endDate: parsed.data.endDate || null,
    // startDate/nextRunAt intentionally untouched — changing the cadence
    // of an already-running rule shouldn't rewind or fast-forward its
    // next occurrence.
  });

  if (!updated) return { status: "error", message: "Recurring rule not found" };

  revalidateTag("vault-module-recurring-rules", "max");
  revalidatePath("/subscriptions");
  return { status: "success" };
}

export async function togglePauseRecurringRule(id: string) {
  const user = await requireUser();
  const rule = await getRecurringRule(user.id, id);
  if (!rule) throw new Error("Recurring rule not found");

  await updateRecurringRule(user.id, id, { isActive: !rule.isActive });
  revalidateTag("vault-module-recurring-rules", "max");
  revalidatePath("/subscriptions");
}

export async function deleteRecurringRule(id: string) {
  const user = await requireUser();
  await deleteRecurringRuleRow(user.id, id);
  revalidateTag("vault-module-recurring-rules", "max");
  revalidatePath("/subscriptions");
}
