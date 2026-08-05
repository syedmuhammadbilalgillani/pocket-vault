import { randomBytes, createHash } from "node:crypto"
import { and, eq, isNull, ne } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { sessions } from "@/lib/database/schema"

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days absolute lifetime

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export type DeviceInfo = {
  deviceName?: string
  browser?: string
  operatingSystem?: string
  ipAddressMasked?: string
}

// Called from the Credentials authorize() callback on successful login.
// Returns the raw token — only its hash is ever persisted (roadmap ADR-003).
export async function createSession(userId: string, device: DeviceInfo) {
  const token = generateSessionToken()
  const [row] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash: hashToken(token),
      deviceName: device.deviceName,
      browser: device.browser,
      operatingSystem: device.operatingSystem,
      ipAddressMasked: device.ipAddressMasked,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS),
    })
    .returning({ id: sessions.id })

  return { sessionId: row.id, token }
}

// Called from the Auth.js `jwt` callback on every request. Returning null
// here is what actually invalidates the JWT — see lib/auth/config.ts.
export async function getActiveSession(token: string) {
  const tokenHash = hashToken(token)
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
    .limit(1)

  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) return null

  return session
}

export async function touchSession(sessionId: string) {
  await db.update(sessions).set({ lastActiveAt: new Date() }).where(eq(sessions.id, sessionId))
}

export async function revokeSession(sessionId: string, userId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
}

export async function revokeAllOtherSessions(userId: string, currentSessionId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.id, currentSessionId),
        isNull(sessions.revokedAt),
      ),
    )
}

export async function listActiveSessions(userId: string) {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
}
