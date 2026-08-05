"use client"

import { useState, type FormEvent } from "react"
import { Download } from "lucide-react"

import { requestExportToken } from "@/server/actions/exports"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export function PasswordConfirmExportButton({
  exportType,
  baseUrl,
  label,
  description,
}: {
  exportType: "transactions" | "vault"
  // Base download URL, without the token query param — e.g.
  // "/api/exports/transactions?month=2026-08". A function prop can't be
  // passed from a Server Component to a Client Component (only "use
  // server" actions can), so the token is appended here instead.
  baseUrl: string
  label: string
  description: string
}) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(undefined)

    const result = await requestExportToken(exportType, password)
    setPending(false)

    if (result.status !== "success" || !result.token) {
      setError(result.message ?? "Something went wrong")
      return
    }

    const separator = baseUrl.includes("?") ? "&" : "?"
    window.location.href = `${baseUrl}${separator}token=${encodeURIComponent(result.token)}`
    setOpen(false)
    setPassword("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download /> {label}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm your password</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="export-password">Password</FieldLabel>
              <Input
                id="export-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>This link expires in 2 minutes.</FieldDescription>
            </Field>
            {error && <FieldError errors={[{ message: error }]} />}
            <Button type="submit" disabled={pending}>
              {pending ? "Verifying..." : "Confirm and download"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
