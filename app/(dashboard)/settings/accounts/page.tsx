import { Suspense } from "react"
import { Wallet } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { listFinancialAccounts, getAccountBalance } from "@/server/repositories/financial-accounts"
import { formatMinor } from "@/lib/money"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AccountFormDialog } from "@/components/accounts/account-form-dialog"
import { TransferDialog } from "@/components/accounts/transfer-dialog"
import { ArchiveAccountButton } from "@/components/accounts/archive-account-button"

const TYPE_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  credit_card: "Credit card",
  digital_wallet: "Digital wallet",
  other: "Other",
}

export default function AccountsPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Keep salary, savings pots, and money you&apos;re holding for someone else separate.
        </p>
      </div>

      <Suspense fallback={<AccountsSkeleton />}>
        <AccountsContent />
      </Suspense>
    </div>
  )
}

function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

async function AccountsContent() {
  const user = await requireUser()
  const accounts = await listFinancialAccounts(user.id)
  const balances = await Promise.all(accounts.map((a) => getAccountBalance(user.id, a.id)))

  return (
    <>
      <div className="flex justify-end gap-2">
        <TransferDialog accounts={accounts} />
        <AccountFormDialog />
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Wallet className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No accounts yet. Create one for your salary, a savings goal, or money held for someone else.
            </p>
            <AccountFormDialog />
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {accounts.map((account, i) => (
            <li key={account.id}>
              <Card>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{account.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {TYPE_LABEL[account.type]}
                    </Badge>
                  </div>
                  <span className={`shrink-0 font-medium ${balances[i] < 0 ? "text-destructive" : ""}`}>
                    {formatMinor(balances[i], account.currency)}
                  </span>
                  <AccountFormDialog
                    accountId={account.id}
                    existingName={account.name}
                    existingType={account.type}
                    existingOpeningBalanceMinor={account.openingBalanceMinor}
                  />
                  <ArchiveAccountButton accountId={account.id} accountName={account.name} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
