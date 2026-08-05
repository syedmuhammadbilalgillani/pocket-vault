"use client"

import { useActionState, useState } from "react"
import { Pencil, Plus } from "lucide-react"

import { setBudget, type BudgetFormState } from "@/server/actions/budgets"
import { minorToAmountString } from "@/lib/money"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const initialState: BudgetFormState = { status: "idle" }

export function BudgetFormDialog({
  categoryId,
  categoryName,
  month,
  year,
  existingLimitMinor,
  existingThreshold,
}: {
  categoryId: string | null // null = total monthly budget
  categoryName: string
  month: number
  year: number
  existingLimitMinor?: number
  existingThreshold?: number
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(setBudget, initialState)

  // Close the dialog on a successful submit without an effect: track the
  // previous state object and react to the transition during render
  // ("adjusting state when a prop changes" — see react.dev/learn/you-might-not-need-an-effect).
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state.status === "success" && open) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={existingLimitMinor ? "outline" : "secondary"} size="sm">
          {existingLimitMinor ? <Pencil /> : <Plus />}
          {existingLimitMinor ? "Edit" : "Set budget"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoryName} budget</DialogTitle>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="categoryId" value={categoryId ?? ""} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`limit-${categoryId ?? "total"}`}>Monthly limit</FieldLabel>
              <Input
                id={`limit-${categoryId ?? "total"}`}
                name="limit"
                inputMode="decimal"
                placeholder="0.00"
                required
                defaultValue={existingLimitMinor != null ? minorToAmountString(existingLimitMinor) : undefined}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`threshold-${categoryId ?? "total"}`}>
                Warn at (% of budget)
              </FieldLabel>
              <Input
                id={`threshold-${categoryId ?? "total"}`}
                name="alertThresholdPercent"
                type="number"
                min={1}
                max={100}
                defaultValue={existingThreshold ?? 80}
              />
            </Field>
            {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save budget"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
