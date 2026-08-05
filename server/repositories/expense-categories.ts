import "server-only"
import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { expenseCategories } from "@/lib/database/schema"

export async function listExpenseCategories(userId: string) {
  return db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId))
    .orderBy(asc(expenseCategories.name))
}

// Suggested categories from roadmap 6.3, seeded lazily on first visit.
export const SUGGESTED_EXPENSE_CATEGORIES = [
  "Housing",
  "Food and groceries",
  "Transport",
  "Utilities",
  "Healthcare",
  "Education",
  "Entertainment",
  "Shopping",
  "Subscriptions",
  "Personal care",
  "Family",
  "Travel",
  "Debt payments",
  "Savings",
  "Charity",
  "Other",
]

export async function ensureDefaultExpenseCategories(userId: string) {
  const existing = await listExpenseCategories(userId)
  if (existing.length > 0) return existing

  return db
    .insert(expenseCategories)
    .values(SUGGESTED_EXPENSE_CATEGORIES.map((name) => ({ userId, name, isSystem: true })))
    .returning()
}
