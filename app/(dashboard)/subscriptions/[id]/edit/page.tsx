import { notFound } from "next/navigation"

import { requireUser } from "@/lib/auth/require-user"
import { getRecurringRule } from "@/server/repositories/recurring-rules"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { minorToAmountString } from "@/lib/money"
import { RecurringRuleForm } from "@/components/subscriptions/recurring-rule-form"

export default async function EditRecurringRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const rule = await getRecurringRule(user.id, id)
  if (!rule) notFound()

  const categories = await listExpenseCategories(user.id)

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Edit recurring transaction</h1>
      <RecurringRuleForm
        categories={categories}
        ruleId={rule.id}
        defaultValues={{
          transactionType: rule.transactionType,
          amount: minorToAmountString(rule.amountMinor),
          categoryId: rule.categoryId,
          description: rule.description,
          frequency: rule.frequency,
          interval: rule.interval,
          startDate: rule.startDate,
          endDate: rule.endDate,
        }}
      />
    </div>
  )
}
