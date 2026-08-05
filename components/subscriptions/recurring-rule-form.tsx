"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"

import type { ExpenseCategory } from "@/lib/database/schema"
import {
  createRecurringRule,
  updateRecurringRuleAction,
  type RecurringRuleFormState,
} from "@/server/actions/recurring-rules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

const initialState: RecurringRuleFormState = { status: "idle" }

const TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "refund", label: "Refund" },
  { value: "transfer", label: "Transfer" },
]

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom (every N days)" },
]

export function RecurringRuleForm({
  categories,
  ruleId,
  defaultValues,
}: {
  categories: ExpenseCategory[]
  ruleId?: string
  defaultValues?: {
    transactionType: string
    amount: string
    categoryId?: string | null
    description?: string | null
    frequency: string
    interval: number
    startDate: string
    endDate?: string | null
  }
}) {
  const router = useRouter()
  const action = ruleId ? updateRecurringRuleAction.bind(null, ruleId) : createRecurringRule
  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.status === "success") router.push("/subscriptions")
  }, [state, router])

  return (
    <Card>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="transactionType">Type</FieldLabel>
              <Select name="transactionType" defaultValue={defaultValues?.transactionType ?? "expense"}>
                <SelectTrigger id="transactionType" className="w-full">
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
              <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" required defaultValue={defaultValues?.amount} />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input id="description" name="description" placeholder="e.g. Netflix" defaultValue={defaultValues?.description ?? undefined} />
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
              <FieldLabel htmlFor="frequency">Frequency</FieldLabel>
              <Select name="frequency" defaultValue={defaultValues?.frequency ?? "monthly"}>
                <SelectTrigger id="frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="interval">Every</FieldLabel>
              <Input
                id="interval"
                name="interval"
                type="number"
                min={1}
                max={365}
                defaultValue={defaultValues?.interval ?? 1}
              />
              <FieldDescription>e.g. "2" with Weekly means every 2 weeks.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="startDate">Start date</FieldLabel>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                readOnly={!!ruleId}
                className={ruleId ? "opacity-60" : undefined}
                defaultValue={defaultValues?.startDate}
              />
              {ruleId && <FieldDescription>Start date can&apos;t change after creation.</FieldDescription>}
            </Field>

            <Field>
              <FieldLabel htmlFor="endDate">End date (optional)</FieldLabel>
              <Input id="endDate" name="endDate" type="date" defaultValue={defaultValues?.endDate ?? undefined} />
            </Field>

            {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}

            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : ruleId ? "Save changes" : "Add recurring transaction"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
