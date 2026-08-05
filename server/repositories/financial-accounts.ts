import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import { unstable_cache, revalidateTag } from "next/cache"

import { db } from "@/lib/database/connection"
import { financialAccounts, transactions } from "@/lib/database/schema"

export const listFinancialAccounts = unstable_cache(
  async (userId: string, includeArchived = false) => {
    const conditions = [eq(financialAccounts.userId, userId)]
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
    .where(and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId)))
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

export async function deleteFinancialAccount(userId: string, id: string) {
  await db
    .delete(financialAccounts)
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
    .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)))
    .limit(1)

  const opening = account?.openingBalanceMinor ?? 0
  return opening + Number(row.credits) - Number(row.debits) + Number(row.transfers)
}
