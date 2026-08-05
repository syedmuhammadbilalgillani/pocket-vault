"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth/require-user"
import { encryptVaultItem, decryptVaultItem } from "@/lib/crypto/vault-item-crypto"
import { logAuditEvent } from "@/lib/auth/audit"
import {
  getVaultItem,
  insertVaultItem,
  updateVaultItemRow,
  softDeleteVaultItem as softDeleteVaultItemRow,
  restoreVaultItem as restoreVaultItemRow,
} from "@/server/repositories/vault-items"

const vaultItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  username: z.string().max(500).optional().or(z.literal("")),
  password: z.string().max(500).optional().or(z.literal("")),
  website: z.string().max(2000).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  isFavorite: z.coerce.boolean().optional(),
})

export type VaultItemFormState = {
  status: "idle" | "error" | "success"
  message?: string
  itemId?: string
}

function readFormFields(formData: FormData) {
  return vaultItemSchema.safeParse({
    title: formData.get("title"),
    categoryId: formData.get("categoryId") || undefined,
    username: formData.get("username") || undefined,
    password: formData.get("password") || undefined,
    website: formData.get("website") || undefined,
    notes: formData.get("notes") || undefined,
    isFavorite: formData.get("isFavorite") === "on",
  })
}

export async function createVaultItem(
  _prevState: VaultItemFormState,
  formData: FormData,
): Promise<VaultItemFormState> {
  const user = await requireUser()
  const parsed = readFormFields(formData)
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { title, categoryId, isFavorite, ...secretFields } = parsed.data
  const encrypted = encryptVaultItem({
    username: secretFields.username || undefined,
    password: secretFields.password || undefined,
    website: secretFields.website || undefined,
    notes: secretFields.notes || undefined,
  })

  const item = await insertVaultItem(user.id, {
    title,
    categoryId: categoryId || null,
    isFavorite: !!isFavorite,
    passwordChangedAt: secretFields.password ? new Date() : null,
    ...encrypted,
  })

  await logAuditEvent({ userId: user.id, eventType: "vault_item.created" })
  revalidatePath("/vault")

  return { status: "success", itemId: item.id }
}

export async function updateVaultItem(
  id: string,
  _prevState: VaultItemFormState,
  formData: FormData,
): Promise<VaultItemFormState> {
  const user = await requireUser()
  const parsed = readFormFields(formData)
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const existing = await getVaultItem(user.id, id)
  if (!existing) {
    return { status: "error", message: "Item not found" }
  }

  const { title, categoryId, isFavorite, ...secretFields } = parsed.data
  const passwordChanged = !!secretFields.password

  // The edit form deliberately leaves password blank rather than prefill
  // it with a decrypted value (see vault-item-form.tsx) — so blank here
  // means "unchanged," not "clear it." Carry the existing plaintext
  // password forward so it survives being re-encrypted under the new DEK.
  const passwordToStore = passwordChanged
    ? secretFields.password
    : decryptVaultItem(existing, ["password"]).password

  // Re-encrypting always generates a brand new DEK — see vault-item-crypto.ts.
  const encrypted = encryptVaultItem({
    username: secretFields.username || undefined,
    password: passwordToStore || undefined,
    website: secretFields.website || undefined,
    notes: secretFields.notes || undefined,
  })

  await updateVaultItemRow(user.id, id, {
    title,
    categoryId: categoryId || null,
    isFavorite: !!isFavorite,
    passwordChangedAt: passwordChanged ? new Date() : existing.passwordChangedAt,
    ...encrypted,
  })

  await logAuditEvent({ userId: user.id, eventType: "vault_item.updated" })
  revalidatePath("/vault")
  revalidatePath(`/vault/${id}`)

  return { status: "success" }
}

export async function deleteVaultItem(id: string) {
  const user = await requireUser()
  await softDeleteVaultItemRow(user.id, id)
  await logAuditEvent({ userId: user.id, eventType: "vault_item.deleted" })
  revalidatePath("/vault")
  revalidatePath("/vault/trash")
}

export async function restoreVaultItem(id: string) {
  const user = await requireUser()
  await restoreVaultItemRow(user.id, id)
  await logAuditEvent({ userId: user.id, eventType: "vault_item.restored" })
  revalidatePath("/vault")
  revalidatePath("/vault/trash")
}

// On-demand decrypt for the reveal button. TODO: gate behind a
// reauthentication prompt per roadmap 6.2/ADR-005 — deferred along with the
// rest of the reauthentication flow (see memory: pocket-vault-deferred-phase2).
export async function revealVaultItemSecret(id: string) {
  const user = await requireUser()
  const item = await getVaultItem(user.id, id)
  if (!item) throw new Error("Item not found")

  const plaintext = decryptVaultItem(item, ["password", "username"])
  await logAuditEvent({ userId: user.id, eventType: "vault_item.revealed" })

  return { username: plaintext.username, password: plaintext.password }
}

