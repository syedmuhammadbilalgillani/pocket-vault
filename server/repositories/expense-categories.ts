import "server-only";
import { and, asc, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { budgets, expenseCategories, users } from "@/lib/database/schema";

export const listExpenseCategories = unstable_cache(
  async (userId: string) => {
    return db
      .select()
      .from(expenseCategories)
      .where(and(eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt)))
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
    .where(
      and(
        eq(expenseCategories.userId, userId),
        ilike(expenseCategories.name, trimmed),
        isNull(expenseCategories.deletedAt),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(expenseCategories)
    .values({ userId, name: trimmed, isSystem: false })
    .returning();

  revalidateTag("vault-module-expense-categories", "max");
  return created;
}

// Soft-deletes the category (see the deletedAt comment in
// lib/database/schema/expenses.ts — a hard DELETE leaves no tombstone for
// the native-app sync engine to pull). Soft-deleting doesn't trigger the
// schema's ON DELETE cascade/set-null FK actions (those only fire on a real
// DELETE), so the two consequences they used to give us for free are
// replicated explicitly here: budgets for this category are soft-deleted
// too (matching the old cascade), while transactions keep their categoryId
// as-is and just render against a deleted category (see listExpenseCategories'
// isNull(deletedAt) filter) rather than snapping to "Uncategorized" — a
// small, intentional behavior improvement, not a bug: historical
// transactions keep their category context instead of losing it.
export async function deleteExpenseCategory(userId: string, id: string) {
  await db
    .update(budgets)
    .set({ deletedAt: new Date() })
    .where(and(eq(budgets.categoryId, id), eq(budgets.userId, userId)));

  await db
    .update(expenseCategories)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)));

  revalidateTag("vault-module-expense-categories", "max");
  revalidateTag("vault-module-budgets", "max");
}

// Same consequences as deleteExpenseCategory, applied to every category the
// user has (seeded and custom alike). The server action requires typed
// confirmation before calling this.
export async function deleteAllExpenseCategories(userId: string) {
  await db
    .update(budgets)
    .set({ deletedAt: new Date() })
    .where(and(eq(budgets.userId, userId), isNull(budgets.deletedAt)));

  const deleted = await db
    .update(expenseCategories)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenseCategories.userId, userId), isNull(expenseCategories.deletedAt)))
    .returning({ id: expenseCategories.id });

  revalidateTag("vault-module-expense-categories", "max");
  revalidateTag("vault-module-budgets", "max");
  return deleted.length;
}

// --- Sync engine support (native-app) ---

export async function listExpenseCategoriesChangedSince(userId: string, since: Date) {
  return db
    .select()
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.userId, userId),
        or(gt(expenseCategories.updatedAt, since), gt(expenseCategories.deletedAt, since)),
      ),
    );
}

// Additive alongside getOrCreateExpenseCategory, which stays as-is for the
// existing web Server Action path — see the matching function in
// financial-accounts.ts for the LWW/cross-user-safety reasoning.
export async function upsertExpenseCategoryFromSync(
  userId: string,
  id: string,
  values: Omit<typeof expenseCategories.$inferInsert, "id" | "userId">,
  clientUpdatedAt: Date,
) {
  const [row] = await db
    .insert(expenseCategories)
    .values({ id, userId, ...values, updatedAt: clientUpdatedAt })
    .onConflictDoUpdate({
      target: expenseCategories.id,
      set: { ...values, updatedAt: clientUpdatedAt },
      setWhere: sql`${expenseCategories.userId} = ${userId} and ${expenseCategories.updatedAt} < ${clientUpdatedAt}`,
    })
    .returning();

  revalidateTag("vault-module-expense-categories", "max");
  return row;
}
