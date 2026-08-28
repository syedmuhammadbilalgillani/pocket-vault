import "server-only";
import { and, eq, gt, gte, isNull, lte, or, sql, sum } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { budgets, transactions } from "@/lib/database/schema";

export const listBudgets = unstable_cache(
  async (userId: string, month: number, year: number) => {
    return db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, month),
          eq(budgets.year, year),
          isNull(budgets.deletedAt),
        ),
      );
  },
  ["listBudgets"],
  {
    tags: ["vault-module-budgets"],
  },
);

export const getTotalBudget = unstable_cache(
  async (userId: string, month: number, year: number) => {
    const [row] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, month),
          eq(budgets.year, year),
          isNull(budgets.categoryId),
          isNull(budgets.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  },
  ["getTotalBudget"],
  {
    tags: ["vault-module-budgets"],
  },
);

// Explicit check-then-write rather than ON CONFLICT: the unique index on
// (userId, categoryId, month, year) doesn't enforce uniqueness for the
// total-budget row (categoryId null — Postgres treats NULL as distinct in
// unique indexes, see the schema comment in lib/database/schema/budgets.ts),
// so ON CONFLICT can't be trusted for that case anyway. This keeps both
// paths (total and per-category) correct with one code path.
export async function upsertBudget(
  userId: string,
  input: {
    categoryId: string | null;
    month: number;
    year: number;
    limitMinor: number;
    alertThresholdPercent?: number;
  },
) {
  const categoryCondition = input.categoryId
    ? eq(budgets.categoryId, input.categoryId)
    : isNull(budgets.categoryId);

  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        categoryCondition,
        eq(budgets.month, input.month),
        eq(budgets.year, input.year),
        isNull(budgets.deletedAt),
      ),
    )
    .limit(1);

  let result;
  if (existing) {
    const [updated] = await db
      .update(budgets)
      .set({
        limitMinor: input.limitMinor,
        alertThresholdPercent: input.alertThresholdPercent ?? 80,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, existing.id))
      .returning();
    result = updated;
  } else {
    const [created] = await db
      .insert(budgets)
      .values({
        userId,
        categoryId: input.categoryId,
        month: input.month,
        year: input.year,
        limitMinor: input.limitMinor,
        alertThresholdPercent: input.alertThresholdPercent ?? 80,
      })
      .returning();
    result = created;
  }

  revalidateTag("vault-module-budgets", "max");
  return result;
}

// Soft-delete — see the deletedAt comment in lib/database/schema/budgets.ts.
export async function deleteBudget(userId: string, id: string) {
  await db
    .update(budgets)
    .set({ deletedAt: new Date() })
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  revalidateTag("vault-module-budgets", "max");
}

// Copies last month's budgets forward if the target month/year has none yet.
// Returns the copied rows, or [] if the target period already has budgets.
export async function copyBudgetsForward(
  userId: string,
  from: { month: number; year: number },
  to: { month: number; year: number },
) {
  const existing = await listBudgets(userId, to.month, to.year);
  if (existing.length > 0) return [];

  const source = await listBudgets(userId, from.month, from.year);
  if (source.length === 0) return [];

  const inserted = await db
    .insert(budgets)
    .values(
      source.map((b) => ({
        userId,
        categoryId: b.categoryId,
        month: to.month,
        year: to.year,
        limitMinor: b.limitMinor,
        currency: b.currency,
        alertThresholdPercent: b.alertThresholdPercent,
        rolloverEnabled: b.rolloverEnabled,
      })),
    )
    .returning();

  revalidateTag("vault-module-budgets", "max");
  return inserted;
}

// Amount spent per category for a month, expenses only (income/refund/
// transfer don't count against a spending budget).
export const getCategorySpending = unstable_cache(
  async (userId: string, monthStart: string, monthEnd: string) => {
    const rows = await db
      .select({
        categoryId: transactions.categoryId,
        total: sum(transactions.amountMinor),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          isNull(transactions.deletedAt),
          gte(transactions.transactionDate, monthStart),
          lte(transactions.transactionDate, monthEnd),
        ),
      )
      .groupBy(transactions.categoryId);

    return rows;
  },
  ["getCategorySpending"],
  {
    tags: ["vault-module-budgets"],
  },
);

// --- Sync engine support (native-app) ---

export async function listBudgetsChangedSince(userId: string, since: Date) {
  return db
    .select()
    .from(budgets)
    .where(
      and(eq(budgets.userId, userId), or(gt(budgets.updatedAt, since), gt(budgets.deletedAt, since))),
    );
}

// Additive alongside upsertBudget, which stays as-is for the existing web
// Server Action path (it has its own check-then-write for the categoryId-
// null-distinctness case — see that function's comment). This path is
// simpler because the client always supplies its own row id, so conflicts
// resolve unambiguously on the primary key regardless of categoryId nulls.
export async function upsertBudgetFromSync(
  userId: string,
  id: string,
  values: Omit<typeof budgets.$inferInsert, "id" | "userId">,
  clientUpdatedAt: Date,
) {
  const [row] = await db
    .insert(budgets)
    .values({ id, userId, ...values, updatedAt: clientUpdatedAt })
    .onConflictDoUpdate({
      target: budgets.id,
      set: { ...values, updatedAt: clientUpdatedAt },
      setWhere: sql`${budgets.userId} = ${userId} and ${budgets.updatedAt} < ${clientUpdatedAt}`,
    })
    .returning();

  revalidateTag("vault-module-budgets", "max");
  return row;
}
