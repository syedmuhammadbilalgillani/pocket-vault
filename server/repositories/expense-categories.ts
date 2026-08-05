import "server-only";
import { and, asc, eq, ilike } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { expenseCategories, users } from "@/lib/database/schema";

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

// Seeds the suggested categories exactly once per user, tracked via
// users.expenseCategoriesSeeded — NOT by checking "does this user
// currently have zero categories." That distinction matters: a user who
// deletes every category on purpose (see deleteAllExpenseCategories) must
// see zero afterward, not have them silently reappear on the next page
// load just because the count happened to be zero again.
export async function ensureDefaultExpenseCategories(userId: string) {
  const [user] = await db
    .select({ expenseCategoriesSeeded: users.expenseCategoriesSeeded })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.expenseCategoriesSeeded) {
    return listExpenseCategories(userId);
  }

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

  await db.update(users).set({ expenseCategoriesSeeded: true }).where(eq(users.id, userId));

  revalidateTag("vault-module-expense-categories", "max");
  return created;
}

// Case-insensitive dedup so "Groceries" and "groceries" don't produce two
// rows — user-created categories, unlike the seeded ones (isSystem: false).
export async function getOrCreateExpenseCategory(userId: string, name: string) {
  const trimmed = name.trim();

  const [existing] = await db
    .select()
    .from(expenseCategories)
    .where(and(eq(expenseCategories.userId, userId), ilike(expenseCategories.name, trimmed)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(expenseCategories)
    .values({ userId, name: trimmed, isSystem: false })
    .returning();

  revalidateTag("vault-module-expense-categories", "max");
  return created;
}

// Deleting a category CASCADEs to any budgets set for it (schema:
// budgets.categoryId → onDelete cascade) but only SET NULLs on
// transactions (schema: transactions.categoryId → onDelete set null) — so
// past transactions survive as "Uncategorized," budgets for that category
// don't. Callers must surface both consequences before confirming.
export async function deleteExpenseCategory(userId: string, id: string) {
  await db
    .delete(expenseCategories)
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)));

  revalidateTag("vault-module-expense-categories", "max");
  revalidateTag("vault-module-budgets", "max");
}

// Same cascade consequences as deleteExpenseCategory, applied to every
// category the user has (seeded and custom alike) — every budget tied to
// a category is deleted, every transaction becomes uncategorized. The
// server action requires typed confirmation before calling this.
export async function deleteAllExpenseCategories(userId: string) {
  const deleted = await db
    .delete(expenseCategories)
    .where(eq(expenseCategories.userId, userId))
    .returning({ id: expenseCategories.id });

  revalidateTag("vault-module-expense-categories", "max");
  revalidateTag("vault-module-budgets", "max");
  return deleted.length;
}
