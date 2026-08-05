"use client"

import { useActionState, useState } from "react"
import { format } from "date-fns"
import { ArrowLeftRight } from "lucide-react"

import type { FinancialAccount } from "@/lib/database/schema"
import { transferBetweenAccounts, type TransferFormState } from "@/server/actions/financial-accounts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

const initialState: TransferFormState = { status: "idle" }

export function TransferDialog({ accounts }: { accounts: FinancialAccount[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(transferBetweenAccounts, initialState)

  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state.status === "success" && open) setOpen(false)
  }

  if (accounts.length < 2) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ArrowLeftRight /> Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer between accounts</DialogTitle>
          <DialogDescription>
            Moves money from one of your accounts to another — doesn&apos;t count as income or expense.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="fromAccountId">From</FieldLabel>
              <Select name="fromAccountId" defaultValue={accounts[0]?.id}>
                <SelectTrigger id="fromAccountId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="toAccountId">To</FieldLabel>
              <Select name="toAccountId" defaultValue={accounts[1]?.id}>
                <SelectTrigger id="toAccountId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="transfer-amount">Amount</FieldLabel>
              <Input id="transfer-amount" name="amount" inputMode="decimal" placeholder="0.00" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="transfer-date">Date</FieldLabel>
              <Input
                id="transfer-date"
                name="transactionDate"
                type="date"
                required
                defaultValue={format(new Date(), "yyyy-MM-dd")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="transfer-notes">Notes</FieldLabel>
              <Input id="transfer-notes" name="notes" placeholder="Optional" />
            </Field>
            {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}
            <Button type="submit" disabled={pending}>
              {pending ? "Transferring..." : "Transfer"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
