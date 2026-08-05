import { Suspense } from "react"
import { notFound } from "next/navigation"

import { requireUser } from "@/lib/auth/require-user"
import { getTransaction } from "@/server/repositories/transactions"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { listFinancialAccounts } from "@/server/repositories/financial-accounts"
import { minorToAmountString } from "@/lib/money"
import { TransactionForm } from "@/components/expenses/transaction-form"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Edit transaction</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <EditTransactionContent params={params} />
      </Suspense>
    </div>
  )
}

async function EditTransactionContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const transaction = await getTransaction(user.id, id)
  if (!transaction) notFound()

  const [categories, accounts] = await Promise.all([
    listExpenseCategories(user.id),
    listFinancialAccounts(user.id),
  ])

  return (
    <TransactionForm
      categories={categories}
      accounts={accounts}
      transactionId={transaction.id}
      defaultValues={{
        type: transaction.type,
        amount: minorToAmountString(transaction.amountMinor),
        categoryId: transaction.categoryId,
        accountId: transaction.accountId,
        merchant: transaction.merchant,
        description: transaction.description,
        transactionDate: transaction.transactionDate,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes,
        tags: transaction.tags,
      }}
    />
  )
}
