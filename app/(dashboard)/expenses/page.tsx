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
import { ChevronLeft, ChevronRight, Plus, Wallet } from "lucide-react";

import { requireUser } from "@/lib/auth/require-user";
import {
  listTransactions,
  getMonthlyTotals,
} from "@/server/repositories/transactions";
import { ensureDefaultExpenseCategories } from "@/server/repositories/expense-categories";
import { formatMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordConfirmExportButton } from "@/components/exports/password-confirm-export-button";
import { CategoryFilter } from "@/components/expenses/category-filter";
import { DeleteTransactionButton } from "@/components/expenses/delete-transaction-button";
import { DuplicateTransactionButton } from "@/components/expenses/duplicate-transaction-button";

function parseMonthParam(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    return parse(month, "yyyy-MM", new Date());
  }
  return new Date();
}

const AMOUNT_COLOR: Record<string, string> = {
  expense: "text-destructive",
  income: "text-primary",
  refund: "text-primary",
  transfer: "text-muted-foreground",
};
const AMOUNT_SIGN: Record<string, string> = {
  expense: "-",
  income: "+",
  refund: "+",
  transfer: "",
};

export default function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; categoryId?: string }>;
}) {
  return (
    <Suspense fallback={<ExpensesSkeleton />}>
      <ExpensesContent searchParams={searchParams} />
    </Suspense>
  );
}

function ExpensesSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-3 grid-cols-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function ExpensesContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; categoryId?: string }>;
}) {
  const user = await requireUser();
  const { month, categoryId } = await searchParams;

  const current = parseMonthParam(month);
  const monthStart = format(startOfMonth(current), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(current), "yyyy-MM-dd");
  const prevMonth = format(subMonths(current, 1), "yyyy-MM");
  const nextMonth = format(addMonths(current, 1), "yyyy-MM");

  const [transactions, totals, categories] = await Promise.all([
    listTransactions(user.id, { monthStart, monthEnd, categoryId }),
    getMonthlyTotals(user.id, monthStart, monthEnd),
    ensureDefaultExpenseCategories(user.id),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const balance = totals.income + totals.refund - totals.expense;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track spending and income.
          </p>
        </div>
        <div className="flex gap-2">
          <PasswordConfirmExportButton
            exportType="transactions"
            label="CSV"
            description="Exports contain your financial data — confirm it's you before downloading."
            baseUrl={`/api/exports/transactions?month=${format(current, "yyyy-MM")}`}
          />
          <Button asChild size="sm">
            <Link href="/expenses/new">
              <Plus /> Add
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link
            href={`/expenses?month=${prevMonth}`}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Link>
        </Button>
        <span className="w-32 text-center font-medium">
          {format(current, "MMMM yyyy")}
        </span>
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={`/expenses?month=${nextMonth}`} aria-label="Next month">
            <ChevronRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Income</CardDescription>
            <CardTitle className="text-lg">
              {formatMinor(totals.income + totals.refund)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Expenses</CardDescription>
            <CardTitle className="text-lg">
              {formatMinor(totals.expense)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Balance</CardDescription>
            <CardTitle
              className={`text-lg ${balance < 0 ? "text-destructive" : ""}`}
            >
              {formatMinor(balance)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <CategoryFilter
        categories={categories}
        month={format(current, "yyyy-MM")}
        categoryId={categoryId}
      />

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Wallet
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No transactions this month.
            </p>
            <Button asChild size="sm">
              <Link href="/expenses/new">Add a transaction</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {transactions.map((t) => (
            <li key={t.id}>
              <Card>
                <CardContent className="flex items-center gap-3 py-3">
                  <Link href={`/expenses/${t.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {t.merchant || t.description || "Transaction"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t.transactionDate}</span>
                      {t.categoryId && categoryNameById.has(t.categoryId) && (
                        <Badge variant="secondary">
                          {categoryNameById.get(t.categoryId)}
                        </Badge>
                      )}
                    </div>
                  </Link>
                  <span
                    className={`shrink-0 font-medium ${AMOUNT_COLOR[t.type]}`}
                  >
                    {AMOUNT_SIGN[t.type]}
                    {formatMinor(t.amountMinor)}
                  </span>
                  <DuplicateTransactionButton transactionId={t.id} />
                  <DeleteTransactionButton transactionId={t.id} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
