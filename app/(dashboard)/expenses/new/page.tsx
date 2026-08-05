import { Suspense } from "react"
import { requireUser } from "@/lib/auth/require-user"
import { ensureDefaultExpenseCategories } from "@/server/repositories/expense-categories"
import { listFinancialAccounts } from "@/server/repositories/financial-accounts"
import { TransactionForm } from "@/components/expenses/transaction-form"
import { Skeleton } from "@/components/ui/skeleton"

export default function NewTransactionPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Add transaction</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <NewTransactionContent />
      </Suspense>
    </div>
  )
}

async function NewTransactionContent() {
  const user = await requireUser()
  const [categories, accounts] = await Promise.all([
    ensureDefaultExpenseCategories(user.id),
    listFinancialAccounts(user.id),
  ])
  return <TransactionForm categories={categories} accounts={accounts} />
}
