import Link from "next/link"
import { Plus, Repeat } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { listRecurringRules } from "@/server/repositories/recurring-rules"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { monthlyEquivalentMinor } from "@/lib/recurring/monthly-equivalent"
import { formatMinor } from "@/lib/money"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RecurringRuleRow } from "@/components/subscriptions/recurring-rule-row"

export default async function SubscriptionsPage() {
  const user = await requireUser()
  const [rules, categories] = await Promise.all([
    listRecurringRules(user.id),
    listExpenseCategories(user.id),
  ])
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  const activeExpenseRules = rules.filter((r) => r.isActive && r.transactionType === "expense")
  const monthlyTotalMinor = activeExpenseRules.reduce(
    (sum, r) => sum + monthlyEquivalentMinor(r.amountMinor, r.frequency, r.interval),
    0,
  )

  const upcoming = rules
    .filter((r) => r.isActive)
    .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime())
    .slice(0, 5)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Recurring income and expenses.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/subscriptions/new">
            <Plus /> Add
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Subscription total per month</CardDescription>
          <CardTitle className="text-2xl">{formatMinor(Math.round(monthlyTotalMinor))}</CardTitle>
        </CardHeader>
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{r.description || "Recurring transaction"}</span>
                <span className="shrink-0 text-muted-foreground">
                  {r.nextRunAt.toISOString().slice(0, 10)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Repeat className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No recurring transactions yet.</p>
            <Button asChild size="sm">
              <Link href="/subscriptions/new">Add one</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li key={rule.id}>
              <RecurringRuleRow
                rule={rule}
                categoryName={rule.categoryId ? categoryNameById.get(rule.categoryId) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
