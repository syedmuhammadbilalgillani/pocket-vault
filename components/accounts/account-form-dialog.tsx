"use client"

import { useActionState, useState } from "react"
import { Pencil, Plus } from "lucide-react"

import {
  createFinancialAccount,
  updateFinancialAccount,
  type AccountFormState,
} from "@/server/actions/financial-accounts"
import { minorToAmountString } from "@/lib/money"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const initialState: AccountFormState = { status: "idle" }

const TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit card" },
  { value: "digital_wallet", label: "Digital wallet" },
  { value: "other", label: "Other" },
]

export function AccountFormDialog({
  accountId,
  existingName,
  existingType,
  existingOpeningBalanceMinor,
}: {
  accountId?: string
  existingName?: string
  existingType?: string
  existingOpeningBalanceMinor?: number
}) {
  const [open, setOpen] = useState(false)
  const action = accountId ? updateFinancialAccount.bind(null, accountId) : createFinancialAccount
  const [state, formAction, pending] = useActionState(action, initialState)

  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state.status === "success" && open) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={accountId ? "ghost" : "default"} size={accountId ? "icon-sm" : "sm"}>
          {accountId ? <Pencil className="size-4" /> : <><Plus /> Add account</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{accountId ? "Edit account" : "New account"}</DialogTitle>
        </DialogHeader>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-name">Name</FieldLabel>
              <Input id="account-name" name="name" required defaultValue={existingName} placeholder="e.g. Eid Fund" />
            </Field>
            {!accountId && (
              <>
                <Field>
                  <FieldLabel htmlFor="account-type">Type</FieldLabel>
                  <Select name="type" defaultValue={existingType ?? "bank"}>
                    <SelectTrigger id="account-type" className="w-full">
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
                  <FieldLabel htmlFor="opening-balance">Opening balance</FieldLabel>
                  <Input
                    id="opening-balance"
                    name="openingBalance"
                    inputMode="decimal"
                    placeholder="0.00"
                    defaultValue={
                      existingOpeningBalanceMinor != null
                        ? minorToAmountString(existingOpeningBalanceMinor)
                        : undefined
                    }
                  />
                  <FieldDescription>How much is already in this account today.</FieldDescription>
                </Field>
              </>
            )}
            {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : accountId ? "Save changes" : "Create account"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
