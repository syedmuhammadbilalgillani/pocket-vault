import { Suspense } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  parse,
} from "date-fns";
import { ChevronLeft, ChevronRight, PiggyBank } from "lucide-react";

import { requireUser } from "@/lib/auth/require-user";
import { ensureDefaultExpenseCategories } from "@/server/repositories/expense-categories";
import { getTotalBudget, listBudgets } from "@/server/repositories/budgets";
import { getBudgetUsage } from "@/server/services/budget-usage";
import { formatMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog";
import { CopyPreviousMonthButton } from "@/components/budgets/copy-previous-month-button";

function parseMonthParam(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month))
    return parse(month, "yyyy-MM", new Date());
  return new Date();
}

function progressColor(
  usagePercent: number,
  isExceeded: boolean,
  isOverThreshold: boolean,
) {
  if (isExceeded) return "bg-destructive";
  if (isOverThreshold) return "bg-yellow-500";
  return "bg-primary";
}

export default function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense fallback={<BudgetsSkeleton />}>
      <BudgetsContent searchParams={searchParams} />
    </Suspense>
  );
}

function BudgetsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex justify-center gap-3">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-9" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

async function BudgetsContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;

  const current = parseMonthParam(monthParam);
  const month = current.getMonth() + 1;
  const year = current.getFullYear();
  const monthStart = format(startOfMonth(current), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(current), "yyyy-MM-dd");
  const prevMonth = format(subMonths(current, 1), "yyyy-MM");
  const nextMonth = format(addMonths(current, 1), "yyyy-MM");

  const [categories, allBudgets, usage, totalBudget] = await Promise.all([
    ensureDefaultExpenseCategories(user.id),
    listBudgets(user.id, month, year),
    getBudgetUsage(user.id, month, year, monthStart, monthEnd),
    getTotalBudget(user.id, month, year),
  ]);

  const usageByBudgetId = new Map(usage.map((u) => [u.id, u]));
  const budgetByCategoryId = new Map(
    allBudgets.filter((b) => b.categoryId).map((b) => [b.categoryId!, b]),
  );
  const totalUsage = totalBudget
    ? usageByBudgetId.get(totalBudget.id)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">Budgets</h1>

      <div className="flex items-center justify-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link
            href={`/budgets?month=${prevMonth}`}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Link>
        </Button>
        <span className="w-32 text-center font-medium">
          {format(current, "MMMM yyyy")}
        </span>
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/budgets?month=${nextMonth}`} aria-label="Next month">
            <ChevronRight />
          </Link>
        </Button>
      </div>

      {allBudgets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <PiggyBank
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No budgets set for this month yet.
            </p>
            <CopyPreviousMonthButton month={month} year={year} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Total monthly budget</CardTitle>
              {totalBudget && (
                <CardDescription>
                  {formatMinor(totalUsage?.spentMinor ?? 0)} of{" "}
                  {formatMinor(totalBudget.limitMinor)} spent
                </CardDescription>
              )}
            </div>
            <BudgetFormDialog
              categoryId={null}
              categoryName="Total monthly"
              month={month}
              year={year}
              existingLimitMinor={totalBudget?.limitMinor}
              existingThreshold={totalBudget?.alertThresholdPercent}
            />
          </div>
        </CardHeader>
        {totalBudget && totalUsage && (
          <CardContent>
            <Progress
              value={Math.min(totalUsage.usagePercent, 100)}
              indicatorClassName={progressColor(
                totalUsage.usagePercent,
                totalUsage.isExceeded,
                totalUsage.isOverThreshold,
              )}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {totalUsage.usagePercent}% used
              {totalUsage.isExceeded && " — budget exceeded"}
              {!totalUsage.isExceeded &&
                totalUsage.isOverThreshold &&
                " — approaching limit"}
            </p>
          </CardContent>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold text-muted-foreground">
          Category budgets
        </h2>
        {categories.map((category) => {
          const budget = budgetByCategoryId.get(category.id);
          const categoryUsage = budget
            ? usageByBudgetId.get(budget.id)
            : undefined;

          return (
            <Card key={category.id}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {budget && categoryUsage && (
                      <p className="text-xs text-muted-foreground">
                        {formatMinor(categoryUsage.spentMinor)} of{" "}
                        {formatMinor(budget.limitMinor)}
                      </p>
                    )}
                  </div>
                  <BudgetFormDialog
                    categoryId={category.id}
                    categoryName={category.name}
                    month={month}
                    year={year}
                    existingLimitMinor={budget?.limitMinor}
                    existingThreshold={budget?.alertThresholdPercent}
                  />
                </div>
                {budget && categoryUsage && (
                  <Progress
                    value={Math.min(categoryUsage.usagePercent, 100)}
                    indicatorClassName={progressColor(
                      categoryUsage.usagePercent,
                      categoryUsage.isExceeded,
                      categoryUsage.isOverThreshold,
                    )}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
