import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { getTransaction } from "@/server/repositories/transactions"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { formatMinor } from "@/lib/money"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DeleteTransactionButton } from "@/components/expenses/delete-transaction-button"

const TYPE_LABEL: Record<string, string> = {
  expense: "Expense",
  income: "Income",
  refund: "Refund",
  transfer: "Transfer",
}

export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<TransactionSkeleton />}>
      <TransactionContent params={params} />
    </Suspense>
  )
}

function TransactionSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-16" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-32" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

async function TransactionContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const transaction = await getTransaction(user.id, id)
  if (!transaction) notFound()

  const categories = await listExpenseCategories(user.id)
  const categoryName = categories.find((c) => c.id === transaction.categoryId)?.name

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">
            {transaction.merchant || transaction.description || "Transaction"}
          </h1>
          <div className="mt-1 flex gap-2">
            <Badge variant="secondary">{TYPE_LABEL[transaction.type]}</Badge>
            {categoryName && <Badge variant="secondary">{categoryName}</Badge>}
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/expenses/${transaction.id}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{formatMinor(transaction.amountMinor, transaction.currency)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{transaction.transactionDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment method</span>
            <span className="capitalize">{transaction.paymentMethod.replace("_", " ")}</span>
          </div>
          {transaction.description && (
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-muted-foreground">Description</span>
              <span className="text-end">{transaction.description}</span>
            </div>
          )}
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1">
              {transaction.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {transaction.notes && (
            <p className="whitespace-pre-wrap border-t pt-2 text-muted-foreground">{transaction.notes}</p>
          )}
        </CardContent>
      </Card>

      <DeleteTransactionButton transactionId={transaction.id} redirectTo="/expenses" />
    </div>
  )
}
