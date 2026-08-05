"use server"

import { z } from "zod"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth/require-user"
import {
  getOrCreateExpenseCategory,
  deleteExpenseCategory,
  deleteAllExpenseCategories,
} from "@/server/repositories/expense-categories"

const nameSchema = z.string().trim().min(1, "Name is required").max(100)

export type CreateExpenseCategoryState = {
  status: "idle" | "error" | "success"
  message?: string
  category?: { id: string; name: string }
}

export async function createExpenseCategory(
  _prevState: CreateExpenseCategoryState,
  formData: FormData,
): Promise<CreateExpenseCategoryState> {
  const user = await requireUser()
  const parsed = nameSchema.safeParse(formData.get("name"))

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid name" }
  }

  const category = await getOrCreateExpenseCategory(user.id, parsed.data)
  return { status: "success", category: { id: category.id, name: category.name } }
}

export async function deleteExpenseCategoryAction(id: string) {
  const user = await requireUser()
  await deleteExpenseCategory(user.id, id)
  revalidatePath("/budgets")
  revalidatePath("/expenses")
}

export type DeleteAllCategoriesState = { status: "idle" | "error" | "success"; message?: string }

// Bulk version of deleteExpenseCategoryAction — same cascade consequences
// (roadmap: budgets for those categories are gone, transactions become
// uncategorized), just applied to every category at once. Gated behind
// typed confirmation since there's no per-item undo for a bulk wipe.
export async function deleteAllExpenseCategoriesAction(
  _prevState: DeleteAllCategoriesState,
  formData: FormData,
): Promise<DeleteAllCategoriesState> {
  const user = await requireUser()
  const confirmation = String(formData.get("confirmation") ?? "")

  if (confirmation !== "DELETE ALL") {
    return { status: "error", message: 'Type "DELETE ALL" to confirm.' }
  }

  await deleteAllExpenseCategories(user.id)
  revalidatePath("/budgets")
  revalidatePath("/expenses")
  return { status: "success" }
}
