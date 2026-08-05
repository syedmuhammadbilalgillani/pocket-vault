import { NextRequest, NextResponse } from "next/server"
import { format, startOfMonth, endOfMonth, parse } from "date-fns"

import { requireUser } from "@/lib/auth/require-user"
import { verifyExportToken } from "@/lib/auth/export-token"
import { listTransactions } from "@/server/repositories/transactions"
import { listExpenseCategories } from "@/server/repositories/expense-categories"
import { minorToAmountString } from "@/lib/money"
import { logAuditEvent } from "@/lib/auth/audit"

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(request: NextRequest) {
  const user = await requireUser()

  const token = request.nextUrl.searchParams.get("token") ?? ""
  if (!verifyExportToken(token, user.id, "transactions")) {
    return NextResponse.json({ error: "Missing or expired export confirmation" }, { status: 401 })
  }

  const monthParam = request.nextUrl.searchParams.get("month")
  const current =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? parse(monthParam, "yyyy-MM", new Date()) : new Date()
  const monthStart = format(startOfMonth(current), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(current), "yyyy-MM-dd")

  const [transactions, categories] = await Promise.all([
    listTransactions(user.id, { monthStart, monthEnd }),
    listExpenseCategories(user.id),
  ])
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  const header = [
    "Date",
    "Type",
    "Amount",
    "Currency",
    "Category",
    "Merchant",
    "Description",
    "Payment method",
    "Tags",
    "Notes",
  ]

  const rows = transactions.map((t) =>
    [
      t.transactionDate,
      t.type,
      minorToAmountString(t.amountMinor),
      t.currency,
      t.categoryId ? (categoryNameById.get(t.categoryId) ?? "") : "",
      t.merchant ?? "",
      t.description ?? "",
      t.paymentMethod,
      (t.tags ?? []).join("; "),
      t.notes ?? "",
    ].map((v) => csvEscape(String(v))),
  )

  const csv = [header, ...rows].map((row) => row.join(",")).join("\r\n")

  await logAuditEvent({
    userId: user.id,
    eventType: "export.transactions",
    metadataRedacted: { month: format(current, "yyyy-MM"), rowCount: transactions.length },
  })

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${format(current, "yyyy-MM")}.csv"`,
    },
  })
}
