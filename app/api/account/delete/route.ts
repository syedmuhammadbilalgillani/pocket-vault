import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { requireBearerUser } from "@/lib/auth/require-bearer-user"
import { verifyCurrentPassword } from "@/lib/auth/reauth"
import { logAuditEvent } from "@/lib/auth/audit"
import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"
import { corsPreflight, withCors } from "@/lib/cors"

export function OPTIONS() {
  return corsPreflight()
}

const requestSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal("DELETE"),
})

// Native-app equivalent of server/actions/account.ts's deleteAccount —
// same password + typed-confirmation reauth, same cascade-delete behavior
// (ON DELETE CASCADE across every user-owned table, ON DELETE SET NULL for
// auditEvents — see that file's comment). No signOut() call here (that's
// a NextAuth/cookie concept); the native client clears its own stored
// token after a successful response. This is not covered by proxy.ts (its
// matcher never includes /api/*), so requireBearerUser is what protects it.
export async function POST(request: NextRequest) {
  const auth = await requireBearerUser(request)
  if (!auth.ok) {
    return withCors(NextResponse.json({ error: auth.message }, { status: auth.status }))
  }

  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 }))
  }

  const valid = await verifyCurrentPassword(auth.userId, parsed.data.password)
  if (!valid) {
    await logAuditEvent({ userId: auth.userId, eventType: "account.deletion_reauth_failed" })
    return withCors(NextResponse.json({ error: "Incorrect password" }, { status: 401 }))
  }

  await logAuditEvent({ userId: auth.userId, eventType: "account.deleted" })
  await db.delete(users).where(eq(users.id, auth.userId))

  return withCors(NextResponse.json({ success: true }))
}
