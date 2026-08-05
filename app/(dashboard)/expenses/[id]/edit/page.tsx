import { notFound } from "next/navigation"

import { requireUser } from "@/lib/auth/require-user"
import { getTransaction } from "@/server/repositories/transactions"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { minorToAmountString } from "@/lib/money"
import { TransactionForm } from "@/components/expenses/transaction-form"

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const transaction = await getTransaction(user.id, id)
  if (!transaction) notFound()

  const categories = await listExpenseCategories(user.id)

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Edit transaction</h1>
      <TransactionForm
        categories={categories}
        transactionId={transaction.id}
        defaultValues={{
          type: transaction.type,
          amount: minorToAmountString(transaction.amountMinor),
          categoryId: transaction.categoryId,
          merchant: transaction.merchant,
          description: transaction.description,
          transactionDate: transaction.transactionDate,
          paymentMethod: transaction.paymentMethod,
          notes: transaction.notes,
          tags: transaction.tags,
        }}
      />
    </div>
  )
}
