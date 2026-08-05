"use client"

import { useActionState, useState } from "react"
import { Plus } from "lucide-react"

import {
  createExpenseCategory,
  type CreateExpenseCategoryState,
} from "@/server/actions/expense-categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

const initialState: CreateExpenseCategoryState = { status: "idle" }

// Shared "add a custom expense category" dialog — used both inline in
// CategorySelect (expenses/subscriptions forms) and standalone on the
// Budgets page, since both read from the same expenseCategories table.
export function AddCategoryDialog({
  onCreated,
  trigger,
}: {
  onCreated: (category: { id: string; name: string }) => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [state, formAction, pending] = useActionState(createExpenseCategory, initialState)

  // React to a successful submit during render rather than in an effect
  // (see components/budgets/budget-form-dialog.tsx for why — avoids the
  // extra render pass react-hooks/set-state-in-effect warns about).
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state.status === "success" && state.category) {
      onCreated(state.category)
      setOpen(false)
      setName("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="icon" aria-label="Add category">
            <Plus />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>Add a custom category for expenses and budgets.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="new-category-name">Name</FieldLabel>
            <Input
              id="new-category-name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pet care"
            />
          </Field>
          {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? "Adding..." : "Add category"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
