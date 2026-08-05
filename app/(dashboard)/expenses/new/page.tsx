import { requireUser } from "@/lib/auth/require-user"
import { ensureDefaultExpenseCategories } from "@/server/repositories/expense-categories"
import { TransactionForm } from "@/components/expenses/transaction-form"

export default async function NewTransactionPage() {
  const user = await requireUser()
  const categories = await ensureDefaultExpenseCategories(user.id)

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Add transaction</h1>
      <TransactionForm categories={categories} />
    </div>
  )
}
