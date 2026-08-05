import { requireUser } from "@/lib/auth/require-user"
import { ensureDefaultExpenseCategories } from "@/server/repositories/expense-categories"
import { RecurringRuleForm } from "@/components/subscriptions/recurring-rule-form"

export default async function NewRecurringRulePage() {
  const user = await requireUser()
  const categories = await ensureDefaultExpenseCategories(user.id)

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Add recurring transaction</h1>
      <RecurringRuleForm categories={categories} />
    </div>
  )
}
