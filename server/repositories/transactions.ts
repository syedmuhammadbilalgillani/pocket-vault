import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  isNotNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { transactions } from "@/lib/database/schema";

export type TransactionFilters = {
  monthStart?: string; // "YYYY-MM-DD", inclusive
  monthEnd?: string; // "YYYY-MM-DD", inclusive
  categoryId?: string;
  paymentMethod?: string;
  search?: string;
  sort?: "date" | "amount";
  limit?: number;
};

// Every query scoped by userId — see server/repositories/vault-items.ts for
// why this matters (roadmap 7.3).
export const listTransactions = unstable_cache(
  async (userId: string, filters?: TransactionFilters) => {
    const conditions = [
      eq(transactions.userId, userId),
      isNull(transactions.deletedAt),
    ];

    if (filters?.monthStart)
      conditions.push(gte(transactions.transactionDate, filters.monthStart));
    if (filters?.monthEnd)
      conditions.push(lte(transactions.transactionDate, filters.monthEnd));
    if (filters?.categoryId)
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    if (filters?.paymentMethod) {
      conditions.push(
        eq(
          transactions.paymentMethod,
          filters.paymentMethod as (typeof transactions.$inferSelect)["paymentMethod"],
        ),
      );
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(transactions.merchant, term),
          ilike(transactions.description, term),
        )!,
      );
    }

    const orderBy =
      filters?.sort === "amount"
        ? [desc(transactions.amountMinor)]
        : [desc(transactions.transactionDate), desc(transactions.createdAt)];

    const query = db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(...orderBy);

    return filters?.limit ? query.limit(filters.limit) : query;
  },
  ["listTransactions"],
  {
    tags: ["vault-module-transactions"],
  },
);

export const getTransaction = unstable_cache(
  async (userId: string, id: string) => {
    const [row] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  },
  ["getTransaction"],
  {
    tags: ["vault-module-transactions"],
  },
);

export async function insertTransaction(
  userId: string,
  values: Omit<
    typeof transactions.$inferInsert,
    "userId" | "id" | "createdAt" | "updatedAt" | "deletedAt"
  >,
) {
  const [row] = await db
    .insert(transactions)
    .values({ userId, ...values })
    .returning();

  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  return row;
}

export async function updateTransactionRow(
  userId: string,
  id: string,
  values: Partial<typeof transactions.$inferInsert>,
) {
  const [row] = await db
    .update(transactions)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .returning();

  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  return row ?? null;
}

export async function softDeleteTransaction(userId: string, id: string) {
  const [row] = await db
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .returning({ id: transactions.id });

  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  return row ?? null;
}

// Totals for a given month, grouped by type. Used for the expenses page
// summary cards and the dashboard.
export const getMonthlyTotals = unstable_cache(
  async (userId: string, monthStart: string, monthEnd: string) => {
    const rows = await db
      .select({
        type: transactions.type,
        total: sql<string>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          gte(transactions.transactionDate, monthStart),
          lte(transactions.transactionDate, monthEnd),
        ),
      )
      .groupBy(transactions.type);

    const totals = { expense: 0, income: 0, refund: 0, transfer: 0 };
    for (const row of rows) {
      totals[row.type] = Number(row.total);
    }
    return totals;
  },
  ["getMonthlyTotals"],
  {
    tags: ["vault-module-transactions"],
  },
);

// Daily expense totals for a month — feeds the dashboard spending trend chart.
export const getDailySpending = unstable_cache(
  async (userId: string, monthStart: string, monthEnd: string) => {
    const rows = await db
      .select({
        date: transactions.transactionDate,
        total: sql<string>`coalesce(sum(${transactions.amountMinor}), 0)`,
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
      .groupBy(transactions.transactionDate)
      .orderBy(asc(transactions.transactionDate));

    return rows.map((r) => ({ date: r.date, totalMinor: Number(r.total) }));
  },
  ["getDailySpending"],
  {
    tags: ["vault-module-transactions"],
  },
);

// System-level, no userId scope — same intentional exception as
// getDueRecurringRules() and purgeOldTrashedVaultItems(). Backs the
// retention cron job, purging soft-deleted transactions past the
// retention window across every account.
export async function purgeOldDeletedTransactions(olderThan: Date) {
  const deleted = await db
    .delete(transactions)
    .where(
      and(
        isNotNull(transactions.deletedAt),
        lt(transactions.deletedAt, olderThan),
      ),
    )
    .returning({ id: transactions.id });

  revalidateTag("vault-module-transactions", "max");
  revalidateTag("vault-module-budgets", "max");
  return deleted.length;
}
