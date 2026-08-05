"use server"

import { eq } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"
import { consumeVerificationToken } from "@/lib/auth/verification-tokens"
import { logAuditEvent } from "@/lib/auth/audit"

export async function verifyEmail(token: string): Promise<{ success: boolean }> {
  const userId = await consumeVerificationToken(token, "email_verification")
  if (!userId) return { success: false }

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId))
  await logAuditEvent({ userId, eventType: "email.verified" })

  return { success: true }
}
