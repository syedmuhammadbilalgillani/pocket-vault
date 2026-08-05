"use server"

import { requireUser } from "@/lib/auth/require-user"
import { verifyCurrentPassword } from "@/lib/auth/reauth"
import { createExportToken } from "@/lib/auth/export-token"
import { logAuditEvent } from "@/lib/auth/audit"
import { checkRateLimit } from "@/lib/auth/rate-limit"

export type RequestExportTokenState = {
  status: "idle" | "error" | "success"
  message?: string
  token?: string
}

export async function requestExportToken(
  exportType: "transactions" | "vault",
  password: string,
): Promise<RequestExportTokenState> {
  const user = await requireUser()

  if (!checkRateLimit(`export-reauth:${user.id}`, { limit: 3, windowMs: 24 * 60 * 60 * 1000 }).allowed) {
    return { status: "error", message: "Too many export attempts. Try again later." }
  }

  const valid = await verifyCurrentPassword(user.id, password)
  if (!valid) {
    await logAuditEvent({ userId: user.id, eventType: "export.reauth_failed", metadataRedacted: { exportType } })
    return { status: "error", message: "Incorrect password" }
  }

  await logAuditEvent({ userId: user.id, eventType: "export.reauth_success", metadataRedacted: { exportType } })
  return { status: "success", token: createExportToken(user.id, exportType) }
}
