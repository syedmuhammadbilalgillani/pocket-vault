import Link from "next/link"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parse } from "date-fns"
import { ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { getMonthlyTotals } from "@/server/repositories/transactions"
import { getCategorySpending, getTotalBudget } from "@/server/repositories/budgets"
import { getBudgetUsage } from "@/server/services/budget-usage"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { formatMinor } from "@/lib/money"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PasswordConfirmExportButton } from "@/components/exports/password-confirm-export-button"

function parseMonthParam(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) return parse(month, "yyyy-MM", new Date())
  return new Date()
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null // undefined % change from zero
  return Math.round(((current - previous) / previous) * 100)
}

function ChangeIndicator({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-xs text-muted-foreground">new</span>
  if (percent === 0) return <Minus className="size-3.5 text-muted-foreground" aria-hidden="true" />
  const Icon = percent > 0 ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-0.5 text-xs ${percent > 0 ? "text-destructive" : "text-primary"}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {Math.abs(percent)}%
    </span>
  )
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const user = await requireUser()
  const { month: monthParam } = await searchParams

  const current = parseMonthParam(monthParam)
  const month = current.getMonth() + 1
  const year = current.getFullYear()
  const monthStart = format(startOfMonth(current), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(current), "yyyy-MM-dd")

  const previous = subMonths(current, 1)
  const prevMonthStart = format(startOfMonth(previous), "yyyy-MM-dd")
  const prevMonthEnd = format(endOfMonth(previous), "yyyy-MM-dd")

  const prevMonthParam = format(previous, "yyyy-MM")
  const nextMonthParam = format(addMonths(current, 1), "yyyy-MM")

  const [totals, prevTotals, categorySpending, categories, totalBudget] = await Promise.all([
    getMonthlyTotals(user.id, monthStart, monthEnd),
    getMonthlyTotals(user.id, prevMonthStart, prevMonthEnd),
    getCategorySpending(user.id, monthStart, monthEnd),
    listExpenseCategories(user.id),
    getTotalBudget(user.id, month, year),
  ])

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const categoryRows = categorySpending
    .filter((row) => row.categoryId)
    .map((row) => ({
      name: categoryNameById.get(row.categoryId!) ?? "Uncategorized",
      totalMinor: Number(row.total ?? 0),
    }))
    .sort((a, b) => b.totalMinor - a.totalMinor)
  const totalSpendMinor = categoryRows.reduce((sum, r) => sum + r.totalMinor, 0)

  const balance = totals.income + totals.refund - totals.expense
  const prevBalance = prevTotals.income + prevTotals.refund - prevTotals.expense

  const budgetUsage = totalBudget
    ? (await getBudgetUsage(user.id, month, year, monthStart, monthEnd)).find((u) => u.id === totalBudget.id)
    : undefined

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Reports</h1>
        <PasswordConfirmExportButton
          exportType="transactions"
          label="Export CSV"
          description="Exports contain your financial data — confirm it's you before downloading."
          baseUrl={`/api/exports/transactions?month=${format(current, "yyyy-MM")}`}
        />
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/reports?month=${prevMonthParam}`} aria-label="Previous month">
            <ChevronLeft />
          </Link>
        </Button>
        <span className="w-32 text-center font-medium">{format(current, "MMMM yyyy")}</span>
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/reports?month=${nextMonthParam}`} aria-label="Next month">
            <ChevronRight />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly summary</CardTitle>
          <CardDescription>Compared with {format(previous, "MMMM yyyy")}.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="font-medium">{formatMinor(totals.income + totals.refund)}</p>
            <ChangeIndicator percent={percentChange(totals.income + totals.refund, prevTotals.income + prevTotals.refund)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="font-medium">{formatMinor(totals.expense)}</p>
            <ChangeIndicator percent={percentChange(totals.expense, prevTotals.expense)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="font-medium">{formatMinor(balance)}</p>
            <ChangeIndicator percent={percentChange(balance, prevBalance)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category report</CardTitle>
          <CardDescription>Share of this month&apos;s spending by category.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {categoryRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No expenses recorded this month.</p>
          ) : (
            categoryRows.map((row) => {
              const share = totalSpendMinor > 0 ? Math.round((row.totalMinor / totalSpendMinor) * 100) : 0
              return (
                <div key={row.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{row.name}</span>
                    <span className="text-muted-foreground">
                      {formatMinor(row.totalMinor)} ({share}%)
                    </span>
                  </div>
                  <Progress value={share} />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget vs. actual</CardTitle>
        </CardHeader>
        <CardContent>
          {budgetUsage ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>Total monthly budget</span>
                <span className="text-muted-foreground">
                  {formatMinor(budgetUsage.spentMinor)} of {formatMinor(budgetUsage.limitMinor)}
                </span>
              </div>
              <Progress
                value={Math.min(budgetUsage.usagePercent, 100)}
                indicatorClassName={budgetUsage.isExceeded ? "bg-destructive" : undefined}
              />
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No total budget set for this month.{" "}
              <Link href="/budgets" className="underline-offset-4 hover:underline">
                Set one
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
