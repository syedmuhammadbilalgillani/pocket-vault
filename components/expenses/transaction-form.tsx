"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

import type { ExpenseCategory } from "@/lib/database/schema"
import {
  createTransaction,
  updateTransaction,
  type TransactionFormState,
} from "@/server/actions/transactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

const initialState: TransactionFormState = { status: "idle" }

const TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "refund", label: "Refund" },
  { value: "transfer", label: "Transfer" },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "debit_card", label: "Debit card" },
  { value: "credit_card", label: "Credit card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "digital_wallet", label: "Digital wallet" },
  { value: "other", label: "Other" },
]

export function TransactionForm({
  categories,
  transactionId,
  defaultValues,
}: {
  categories: ExpenseCategory[]
  transactionId?: string
  defaultValues?: {
    type: string
    amount: string
    categoryId?: string | null
    merchant?: string | null
    description?: string | null
    transactionDate: string
    paymentMethod: string
    notes?: string | null
    tags?: string[] | null
  }
}) {
  const router = useRouter()
  const action = transactionId ? updateTransaction.bind(null, transactionId) : createTransaction
  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.status === "success") {
      router.push("/expenses")
    }
  }, [state, router])

  return (
    <Card>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="type">Type</FieldLabel>
              <Select name="type" defaultValue={defaultValues?.type ?? "expense"}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="amount">Amount</FieldLabel>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                placeholder="0.00"
                required
                defaultValue={defaultValues?.amount}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="transactionDate">Date</FieldLabel>
              <Input
                id="transactionDate"
                name="transactionDate"
                type="date"
                required
                defaultValue={defaultValues?.transactionDate ?? format(new Date(), "yyyy-MM-dd")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="categoryId">Category</FieldLabel>
              <Select name="categoryId" defaultValue={defaultValues?.categoryId ?? undefined}>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="paymentMethod">Payment method</FieldLabel>
              <Select name="paymentMethod" defaultValue={defaultValues?.paymentMethod ?? "other"}>
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="merchant">Merchant</FieldLabel>
              <Input id="merchant" name="merchant" defaultValue={defaultValues?.merchant ?? undefined} />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" defaultValue={defaultValues?.description ?? undefined} />
            </Field>

            <Field>
              <FieldLabel htmlFor="tags">Tags</FieldLabel>
              <Input
                id="tags"
                name="tags"
                placeholder="comma, separated, tags"
                defaultValue={defaultValues?.tags?.join(", ")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes ?? undefined} />
            </Field>

            {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}

            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : transactionId ? "Save changes" : "Add transaction"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
