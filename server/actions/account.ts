"use server"

import { eq } from "drizzle-orm"

import { requireUser } from "@/lib/auth/require-user"
import { verifyCurrentPassword } from "@/lib/auth/reauth"
import { logAuditEvent } from "@/lib/auth/audit"
import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"
import { signOut } from "@/auth"

export type DeleteAccountState = { status: "idle" | "error"; message?: string }

// Deleting the user row cascades to every user-owned table (sessions,
// vault items, transactions, budgets, recurring rules, notifications,
// receipts) via ON DELETE CASCADE in the schema — see
// lib/database/schema/*.ts. auditEvents is the one deliberate exception:
// it's ON DELETE SET NULL, so the audit trail survives account deletion
// per roadmap 16 (retention/compliance). Deleting the row also deletes the
// caller's own session row, so the next request's revocation check
// (auth.ts jwt callback) fails closed and logs them out on its own — the
// explicit signOut() below just makes that immediate for this response
// instead of waiting for the next navigation.
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser()
  const password = String(formData.get("password") ?? "")
  const confirmation = String(formData.get("confirmation") ?? "")

  if (confirmation !== "DELETE") {
    return { status: "error", message: 'Type "DELETE" to confirm.' }
  }

  const valid = await verifyCurrentPassword(user.id, password)
  if (!valid) {
    await logAuditEvent({ userId: user.id, eventType: "account.deletion_reauth_failed" })
    return { status: "error", message: "Incorrect password" }
  }

  await logAuditEvent({ userId: user.id, eventType: "account.deleted" })
  await db.delete(users).where(eq(users.id, user.id))

  await signOut({ redirectTo: "/" })
  return { status: "idle" }
}
