import { NextRequest, NextResponse } from "next/server"

import { requireBearerUser } from "@/lib/auth/require-bearer-user"
import { listFinancialAccountsChangedSince } from "@/server/repositories/financial-accounts"
import { listExpenseCategoriesChangedSince } from "@/server/repositories/expense-categories"
import { listTransactionsChangedSince } from "@/server/repositories/transactions"
import { listBudgetsChangedSince } from "@/server/repositories/budgets"
import { listVaultItemsChangedSince } from "@/server/repositories/vault-items"
import { corsPreflight, withCors } from "@/lib/cors"

export function OPTIONS() {
  return corsPreflight()
}

// Delta pull for the native-app sync engine. `since` is the client's last
// successful pull cursor (omit/invalid => epoch, i.e. a full initial sync).
// Soft-deleted rows are included deliberately — see the deletedAt comment
// in lib/database/schema/expenses.ts — so the client can tombstone them
// locally instead of them just vanishing with no trace. Phase 1 scope:
// financial accounts, expense categories, transactions, budgets. Phase 2
// adds vault items (see listVaultItemsChangedSince — plaintext, decrypted
// server-side, sent over this authenticated HTTPS call, per the plan's
// Phase 2 design). Recurring rules and notifications are still follow-ups.
export async function GET(request: NextRequest) {
  const auth = await requireBearerUser(request)
  if (!auth.ok) {
    return withCors(NextResponse.json({ error: auth.message }, { status: auth.status }))
  }

  const sinceParam = request.nextUrl.searchParams.get("since")
  const since = sinceParam && !Number.isNaN(Date.parse(sinceParam)) ? new Date(sinceParam) : new Date(0)

  // Captured before the queries run: a client that stores this as its new
  // cursor won't miss a row written between "now" and when these queries
  // actually execute, at the cost of re-seeing it on the next pull (a
  // harmless no-op re-apply, not a correctness issue for LWW upserts).
  const serverTime = new Date().toISOString()

  const [financialAccounts, expenseCategories, transactions, budgets, vaultItems] = await Promise.all([
    listFinancialAccountsChangedSince(auth.userId, since),
    listExpenseCategoriesChangedSince(auth.userId, since),
    listTransactionsChangedSince(auth.userId, since),
    listBudgetsChangedSince(auth.userId, since),
    listVaultItemsChangedSince(auth.userId, since),
  ])

  return withCors(
    NextResponse.json({
      serverTime,
      changes: { financialAccounts, expenseCategories, transactions, budgets, vaultItems },
    }),
  )
}
