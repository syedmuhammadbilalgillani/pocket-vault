"use client"

import { useActionState } from "react"

import { deleteAccount, type DeleteAccountState } from "@/server/actions/account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const initialState: DeleteAccountState = { status: "idle" }

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, initialState)

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently deletes your account, vault, expenses, and budgets. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="confirmation">
                Type <span className="font-mono">DELETE</span> to confirm
              </FieldLabel>
              <Input id="confirmation" name="confirmation" required autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel htmlFor="delete-password">Password</FieldLabel>
              <Input id="delete-password" name="password" type="password" autoComplete="current-password" required />
              <FieldDescription>Confirms it&apos;s you before deleting anything.</FieldDescription>
            </Field>
            {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting..." : "Delete my account permanently"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
