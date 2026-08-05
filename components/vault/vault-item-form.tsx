"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dices, Eye, EyeOff } from "lucide-react"

import type { VaultCategory } from "@/lib/database/schema"
import { createVaultItem, updateVaultItem, type VaultItemFormState } from "@/server/actions/vault"
import {
  DEFAULT_GENERATOR_OPTIONS,
  estimatePasswordStrength,
  generatePassword,
} from "@/lib/vault/password-generator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

const initialState: VaultItemFormState = { status: "idle" }

const STRENGTH_COLORS = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-lime-500", "bg-primary"]

export function VaultItemForm({
  categories,
  itemId,
  defaultValues,
  hasExistingPassword,
}: {
  categories: VaultCategory[]
  itemId?: string
  defaultValues?: {
    title: string
    categoryId?: string | null
    isFavorite?: boolean
    username?: string
    website?: string
    notes?: string
  }
  hasExistingPassword?: boolean
}) {
  const router = useRouter()
  const action = itemId ? updateVaultItem.bind(null, itemId) : createVaultItem
  const [state, formAction, pending] = useActionState(action, initialState)

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const strength = estimatePasswordStrength(password)

  useEffect(() => {
    if (state.status === "success") {
      router.push(itemId ? `/vault/${itemId}` : `/vault/${state.itemId}`)
    }
  }, [state, itemId, router])

  return (
    <Card>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" name="title" required defaultValue={defaultValues?.title} />
            </Field>

            <Field>
              <FieldLabel htmlFor="categoryId">Category</FieldLabel>
              <Select name="categoryId" defaultValue={defaultValues?.categoryId ?? undefined}>
                <SelectTrigger id="categoryId" className="w-full">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="username">Email or username</FieldLabel>
              <Input id="username" name="username" defaultValue={defaultValues?.username} />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={hasExistingPassword ? "Leave blank to keep current password" : ""}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 end-2 flex items-center text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Generate password"
                  onClick={() => {
                    setPassword(generatePassword(DEFAULT_GENERATOR_OPTIONS))
                    setShowPassword(true)
                  }}
                >
                  <Dices />
                </Button>
              </div>
              {password && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-1 flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-full ${
                          i <= strength.score ? STRENGTH_COLORS[strength.score] : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{strength.label}</span>
                </div>
              )}
              {hasExistingPassword && (
                <FieldDescription>Leave blank to keep the current password.</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="website">Website</FieldLabel>
              <Input id="website" name="website" type="url" defaultValue={defaultValues?.website} />
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes} />
            </Field>

            <Field orientation="horizontal">
              <Checkbox id="isFavorite" name="isFavorite" defaultChecked={defaultValues?.isFavorite} />
              <FieldLabel htmlFor="isFavorite" className="font-normal">
                Mark as favorite
              </FieldLabel>
            </Field>

            {state.status === "error" && <FieldError errors={[{ message: state.message }]} />}

            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : itemId ? "Save changes" : "Add credential"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
