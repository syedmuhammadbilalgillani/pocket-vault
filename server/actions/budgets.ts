"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { subMonths } from "date-fns";

import { requireUser } from "@/lib/auth/require-user";
import { parseAmountToMinor } from "@/lib/money";
import {
  upsertBudget,
  deleteBudget as deleteBudgetRow,
  copyBudgetsForward,
} from "@/server/repositories/budgets";

const budgetSchema = z.object({
  categoryId: z.string().uuid().optional().or(z.literal("")),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  limit: z
    .string()
    .refine((v) => parseAmountToMinor(v) !== null, "Enter a valid amount"),
  alertThresholdPercent: z.coerce.number().int().min(1).max(100).default(80),
});

export type BudgetFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function setBudget(
  _prevState: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId") || undefined,
    month: formData.get("month"),
    year: formData.get("year"),
    limit: formData.get("limit"),
    alertThresholdPercent: formData.get("alertThresholdPercent") || 80,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await upsertBudget(user.id, {
    categoryId: parsed.data.categoryId || null,
    month: parsed.data.month,
    year: parsed.data.year,
    limitMinor: parseAmountToMinor(parsed.data.limit)!,
    alertThresholdPercent: parsed.data.alertThresholdPercent,
  });

  revalidateTag("vault-module-budgets", "max");
  revalidatePath("/budgets");
  return { status: "success" };
}

export async function deleteBudget(id: string) {
  const user = await requireUser();
  await deleteBudgetRow(user.id, id);
  revalidateTag("vault-module-budgets", "max");
  revalidatePath("/budgets");
}

export async function copyPreviousMonthBudgets(month: number, year: number) {
  const user = await requireUser();
  const current = new Date(year, month - 1, 1);
  const previous = subMonths(current, 1);

  await copyBudgetsForward(
    user.id,
    { month: previous.getMonth() + 1, year: previous.getFullYear() },
    { month, year },
  );

  revalidateTag("vault-module-budgets", "max");
  revalidatePath("/budgets");
}
