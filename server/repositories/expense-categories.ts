import "server-only";
import { asc, eq } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { expenseCategories } from "@/lib/database/schema";

export const listExpenseCategories = unstable_cache(
  async (userId: string) => {
    return db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId))
      .orderBy(asc(expenseCategories.name));
  },
  ["listExpenseCategories"],
  {
    tags: ["vault-module-expense-categories"],
  },
);

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
];

export async function ensureDefaultExpenseCategories(userId: string) {
  const existing = await listExpenseCategories(userId);
  if (existing.length > 0) return existing;

  const created = await db
    .insert(expenseCategories)
    .values(
      SUGGESTED_EXPENSE_CATEGORIES.map((name) => ({
        userId,
        name,
        isSystem: true,
      })),
    )
    .returning();

  revalidateTag("vault-module-expense-categories", "max");
  return created;
}
