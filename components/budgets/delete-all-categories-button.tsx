"use client"

import { useActionState, useState } from "react"
import { Trash2 } from "lucide-react"

import {
  deleteAllExpenseCategoriesAction,
  type DeleteAllCategoriesState,
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

const initialState: DeleteAllCategoriesState = { status: "idle" }

export function DeleteAllCategoriesButton() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(deleteAllExpenseCategoriesAction, initialState)

  // Close on success during render rather than in an effect — see
  // components/budgets/budget-form-dialog.tsx for why.
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state.status === "success" && open) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-destructive">
          <Trash2 /> Delete all
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete all categories?</DialogTitle>
          <DialogDescription>
            Every budget tied to a category will be deleted too. Past transactions keep their amounts but
            become uncategorized. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="confirmation">
              Type <span className="font-mono">DELETE ALL</span> to confirm
            </FieldLabel>
            <Input id="confirmation" name="confirmation" required autoComplete="off" />
          </Field>
          {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Deleting..." : "Delete all categories"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
