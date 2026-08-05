import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { KeyRound, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { getMonthlyTotals, getDailySpending, listTransactions } from "@/server/repositories/transactions"
import { getCategorySpending, getTotalBudget } from "@/server/repositories/budgets"
import { getBudgetUsage } from "@/server/services/budget-usage"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { countVaultItems } from "@/server/repositories/vault-items"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PrivacyProvider } from "@/components/dashboard/privacy-context"
import { PrivacyToggle } from "@/components/dashboard/privacy-toggle"
import { MoneyValue } from "@/components/dashboard/money-value"
import { SpendingTrendChart } from "@/components/dashboard/spending-trend-chart"
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart"
import { IncomeVsExpenseChart } from "@/components/dashboard/income-vs-expense-chart"

export default async function DashboardPage() {
  const user = await requireUser()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd")

  const [totals, dailySpending, categorySpending, categories, vaultCount, totalBudget, recentTransactions] =
    await Promise.all([
      getMonthlyTotals(user.id, monthStart, monthEnd),
      getDailySpending(user.id, monthStart, monthEnd),
      getCategorySpending(user.id, monthStart, monthEnd),
      listExpenseCategories(user.id),
      countVaultItems(user.id),
      getTotalBudget(user.id, month, year),
      listTransactions(user.id, { limit: 5 }),
    ])

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const categoryChartData = categorySpending
    .filter((row) => row.categoryId)
    .map((row) => ({
      name: categoryNameById.get(row.categoryId!) ?? "Uncategorized",
      totalMinor: Number(row.total ?? 0),
    }))
  const topCategory = [...categoryChartData].sort((a, b) => b.totalMinor - a.totalMinor)[0]

  const balance = totals.income + totals.refund - totals.expense

  const budgetUsage = totalBudget
    ? (await getBudgetUsage(user.id, month, year, monthStart, monthEnd)).find((u) => u.id === totalBudget.id)
    : undefined

  return (
    <PrivacyProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your security and spending overview.</p>
          </div>
          <PrivacyToggle />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>This month&apos;s expenses</CardDescription>
                <TrendingDown className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">
                <MoneyValue amountMinor={totals.expense} />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>This month&apos;s income</CardDescription>
                <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">
                <MoneyValue amountMinor={totals.income + totals.refund} />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>Remaining balance</CardDescription>
                <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">
                <MoneyValue amountMinor={balance} />
              </CardTitle>
            </CardHeader>
          </Card>

          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>Budget usage</CardDescription>
                <PiggyBank className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">{budgetUsage ? `${budgetUsage.usagePercent}%` : "—"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {budgetUsage ? (
                  <>
                    <MoneyValue amountMinor={budgetUsage.spentMinor} /> of{" "}
                    <MoneyValue amountMinor={budgetUsage.limitMinor} />
                  </>
                ) : (
                  <Link href="/budgets" className="underline-offset-4 hover:underline">
                    No budget set
                  </Link>
                )}
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>Saved credentials</CardDescription>
                <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">{vaultCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/vault" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                View vault
              </Link>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardDescription>Top spending category</CardDescription>
              <CardTitle className="text-2xl">{topCategory?.name ?? "—"}</CardTitle>
            </CardHeader>
            {topCategory && (
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  <MoneyValue amountMinor={topCategory.totalMinor} />
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Daily spending trend</CardTitle>
            </CardHeader>
            <CardContent>
              <SpendingTrendChart data={dailySpending} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Income vs. expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <IncomeVsExpenseChart incomeMinor={totals.income + totals.refund} expenseMinor={totals.expense} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Category spending</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBreakdownChart data={categoryChartData} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Your latest expenses and income.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No transactions yet. Add your first expense to get started.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recentTransactions.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/expenses/${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.merchant || t.description || "Transaction"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{t.transactionDate}</span>
                          {t.categoryId && categoryNameById.has(t.categoryId) && (
                            <Badge variant="secondary">{categoryNameById.get(t.categoryId)}</Badge>
                          )}
                        </div>
                      </div>
                      <MoneyValue
                        amountMinor={t.amountMinor}
                        className={t.type === "expense" ? "text-destructive" : "text-primary"}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PrivacyProvider>
  )
}
