import "server-only"
import { and, eq, gt, isNull, or, sql } from "drizzle-orm"
import { unstable_cache, revalidateTag } from "next/cache"

import { db } from "@/lib/database/connection"
import { financialAccounts, transactions } from "@/lib/database/schema"

export const listFinancialAccounts = unstable_cache(
  async (userId: string, includeArchived = false) => {
    const conditions = [eq(financialAccounts.userId, userId), isNull(financialAccounts.deletedAt)]
    if (!includeArchived) conditions.push(eq(financialAccounts.isArchived, false))

    return db
      .select()
      .from(financialAccounts)
      .where(and(...conditions))
      .orderBy(financialAccounts.name)
  },
  ["listFinancialAccounts"],
  { tags: ["vault-module-financial-accounts"] },
)

export async function getFinancialAccount(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, id),
        eq(financialAccounts.userId, userId),
        isNull(financialAccounts.deletedAt),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function insertFinancialAccount(
  userId: string,
  values: Omit<typeof financialAccounts.$inferInsert, "userId" | "id" | "createdAt" | "updatedAt">,
) {
  const [row] = await db
    .insert(financialAccounts)
    .values({ userId, ...values })
    .returning()

  revalidateTag("vault-module-financial-accounts", "max")
  return row
}

export async function updateFinancialAccountRow(
  userId: string,
  id: string,
  values: Partial<typeof financialAccounts.$inferInsert>,
) {
  const [row] = await db
    .update(financialAccounts)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
    .returning()

  revalidateTag("vault-module-financial-accounts", "max")
  return row ?? null
}

// Archive rather than delete by default — an account with transaction
// history shouldn't disappear (transactions.accountId is ON DELETE SET
// NULL, so a hard delete wouldn't lose the transactions, but it would
// orphan them from the account they actually belong to).
export async function archiveFinancialAccount(userId: string, id: string) {
  return updateFinancialAccountRow(userId, id, { isArchived: true })
}

// Soft-delete rather than a hard DELETE: past transactions reference this
// account (ON DELETE SET NULL), and other devices need a tombstone to sync
// against — see the deletedAt comment in lib/database/schema/expenses.ts.
export async function deleteFinancialAccount(userId: string, id: string) {
  await db
    .update(financialAccounts)
    .set({ deletedAt: new Date() })
    .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))

  revalidateTag("vault-module-financial-accounts", "max")
}

// Running balance, not just this month's — openingBalanceMinor plus every
// income/refund (credit), minus every expense (debit), plus/minus signed
// transfer amounts (see server/actions/financial-accounts.ts: a transfer
// is two linked rows — a negative amountMinor on the source account and a
// positive one on the destination account, both type "transfer").
export async function getAccountBalance(userId: string, accountId: string) {
  const [row] = await db
    .select({
      credits: sql<string>`coalesce(sum(case when ${transactions.type} in ('income', 'refund') then ${transactions.amountMinor} else 0 end), 0)`,
      debits: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountMinor} else 0 end), 0)`,
      transfers: sql<string>`coalesce(sum(case when ${transactions.type} = 'transfer' then ${transactions.amountMinor} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        isNull(transactions.deletedAt),
      ),
    )

  const [account] = await db
    .select({ openingBalanceMinor: financialAccounts.openingBalanceMinor })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        eq(financialAccounts.userId, userId),
        isNull(financialAccounts.deletedAt),
      ),
    )
    .limit(1)

  const opening = account?.openingBalanceMinor ?? 0
  return opening + Number(row.credits) - Number(row.debits) + Number(row.transfers)
}

// --- Sync engine support (native-app) ---

// Rows changed since the client's last pull cursor, soft-deletes included
// so the client can tombstone them locally instead of them just vanishing
// server-side with no trace.
export async function listFinancialAccountsChangedSince(userId: string, since: Date) {
  return db
    .select()
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.userId, userId),
        or(gt(financialAccounts.updatedAt, since), gt(financialAccounts.deletedAt, since)),
      ),
    )
}

// Applies a client-originated mutation keyed by the client-generated UUID.
// Additive alongside insertFinancialAccount/updateFinancialAccountRow, which
// stay exactly as they are for the existing web Server Action path — this
// is only for /api/sync/push. Last-write-wins: a push older than what the
// server already has is a no-op rather than clobbering newer data.
export async function upsertFinancialAccountFromSync(
  userId: string,
  id: string,
  values: Omit<typeof financialAccounts.$inferInsert, "id" | "userId">,
  clientUpdatedAt: Date,
) {
  const [row] = await db
    .insert(financialAccounts)
    .values({ id, userId, ...values, updatedAt: clientUpdatedAt })
    .onConflictDoUpdate({
      target: financialAccounts.id,
      set: { ...values, updatedAt: clientUpdatedAt },
      setWhere: sql`${financialAccounts.userId} = ${userId} and ${financialAccounts.updatedAt} < ${clientUpdatedAt}`,
    })
    .returning()

  revalidateTag("vault-module-financial-accounts", "max")
  return row
}
