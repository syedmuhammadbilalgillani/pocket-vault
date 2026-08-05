import "server-only"

import { listBudgets, getCategorySpending } from "@/server/repositories/budgets"
import { getMonthlyTotals } from "@/server/repositories/transactions"

export type BudgetUsage = {
  id: string
  categoryId: string | null
  limitMinor: number
  alertThresholdPercent: number
  spentMinor: number
  remainingMinor: number
  usagePercent: number
  isOverThreshold: boolean
  isExceeded: boolean
}

export async function getBudgetUsage(
  userId: string,
  month: number,
  year: number,
  monthStart: string,
  monthEnd: string,
): Promise<BudgetUsage[]> {
  const [budgetRows, categorySpending, totals] = await Promise.all([
    listBudgets(userId, month, year),
    getCategorySpending(userId, monthStart, monthEnd),
    getMonthlyTotals(userId, monthStart, monthEnd),
  ])

  const spentByCategory = new Map(categorySpending.map((row) => [row.categoryId, Number(row.total ?? 0)]))

  return budgetRows.map((budget) => {
    const spentMinor = budget.categoryId ? spentByCategory.get(budget.categoryId) ?? 0 : totals.expense
    const usagePercent = budget.limitMinor > 0 ? Math.round((spentMinor / budget.limitMinor) * 100) : 0

    return {
      id: budget.id,
      categoryId: budget.categoryId,
      limitMinor: budget.limitMinor,
      alertThresholdPercent: budget.alertThresholdPercent,
      spentMinor,
      remainingMinor: budget.limitMinor - spentMinor,
      usagePercent,
      isOverThreshold: usagePercent >= budget.alertThresholdPercent,
      isExceeded: spentMinor > budget.limitMinor,
    }
  })
}
