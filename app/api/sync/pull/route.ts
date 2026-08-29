import { NextRequest, NextResponse } from "next/server"

import { requireBearerUser } from "@/lib/auth/require-bearer-user"
import { listFinancialAccountsChangedSince } from "@/server/repositories/financial-accounts"
import { listExpenseCategoriesChangedSince } from "@/server/repositories/expense-categories"
import { listTransactionsChangedSince } from "@/server/repositories/transactions"
import { listBudgetsChangedSince } from "@/server/repositories/budgets"
import { listVaultItemsChangedSince } from "@/server/repositories/vault-items"
import { listVaultCategoriesChangedSince } from "@/server/repositories/vault-categories"
import { listRecurringRulesChangedSince } from "@/server/repositories/recurring-rules"
import { listNotificationsChangedSince } from "@/server/repositories/notifications"
import { corsPreflight, withCors } from "@/lib/cors"

export function OPTIONS() {
  return corsPreflight()
}

// Delta pull for the native-app sync engine. `since` is the client's last
// successful pull cursor (omit/invalid => epoch, i.e. a full initial sync).
// Soft-deleted rows are included deliberately — see the deletedAt comment
// in lib/database/schema/expenses.ts — so the client can tombstone them
// locally instead of them just vanishing with no trace. Vault items are
// decrypted server-side before being included here (see
// listVaultItemsChangedSince). Notifications are server-authored — the
// client only ever reads them and pushes back "mark read", never content.
export async function GET(request: NextRequest) {
  const auth = await requireBearerUser(request)
  if (!auth.ok) {
    return withCors(NextResponse.json({ error: auth.message }, { status: auth.status }))
  }

  // Wrapped end-to-end: an uncaught exception here would otherwise fall
  // through to Next's default error response, which never runs through
  // withCors() — the browser then reports it as a CORS failure and hides
  // the actual error. Always returning a CORS'd response, even on failure,
  // keeps the real error visible in the client instead of masked as CORS.
  try {
    const sinceParam = request.nextUrl.searchParams.get("since")
    const since = sinceParam && !Number.isNaN(Date.parse(sinceParam)) ? new Date(sinceParam) : new Date(0)

    // Captured before the queries run: a client that stores this as its new
    // cursor won't miss a row written between "now" and when these queries
    // actually execute, at the cost of re-seeing it on the next pull (a
    // harmless no-op re-apply, not a correctness issue for LWW upserts).
    const serverTime = new Date().toISOString()

    const [
      financialAccounts,
      expenseCategories,
      transactions,
      budgets,
      vaultItems,
      vaultCategories,
      recurringRules,
      notifications,
    ] = await Promise.all([
      listFinancialAccountsChangedSince(auth.userId, since),
      listExpenseCategoriesChangedSince(auth.userId, since),
      listTransactionsChangedSince(auth.userId, since),
      listBudgetsChangedSince(auth.userId, since),
      listVaultItemsChangedSince(auth.userId, since),
      listVaultCategoriesChangedSince(auth.userId, since),
      listRecurringRulesChangedSince(auth.userId, since),
      listNotificationsChangedSince(auth.userId, since),
    ])

    return withCors(
      NextResponse.json({
        serverTime,
        changes: {
          financialAccounts,
          expenseCategories,
          transactions,
          budgets,
          vaultItems,
          vaultCategories,
          recurringRules,
          notifications,
        },
      }),
    )
  } catch (error) {
    console.error("[sync/pull] failed", error)
    return withCors(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal error" },
        { status: 500 },
      ),
    )
  }
}
