import "server-only"
import { eq } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"
import { verifyPassword } from "@/lib/auth/password"
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit"
import { logAuditEvent } from "@/lib/auth/audit"

// Shared by both the cookie-based web login (auth.ts's Credentials
// authorize()) and the token-based native login
// (app/api/auth/token/route.ts) so the rate limiting, account-enumeration
// prevention, and email-verification check can't drift between the two
// entry points — they're the same security-sensitive operation with two
// different transports for the result.

export type AuthenticateResult =
  | { ok: true; user: { id: string; email: string; displayName: string | null } }
  | { ok: false; reason: "rate_limited" | "invalid_credentials" | "email_not_verified" }

// A fixed, valid Argon2id hash with no corresponding real password. Used to
// run a comparison even when the account doesn't exist, so that path
// doesn't respond measurably faster (account enumeration prevention,
// roadmap 7.4).
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$m7JXEigh9CPUatCmDxNDSw$r/fbWipfc1H6jKs6QhQwNjAqbqeHAEHZf5Q87caNKKQ"

export async function authenticateWithPassword(
  email: string,
  password: string,
  ip: string | undefined,
): Promise<AuthenticateResult> {
  const normalizedEmail = email.toLowerCase()
  const rateLimitKey = `login:${normalizedEmail}`
  const ipRateLimitKey = `login-ip:${ip ?? "unknown"}`

  if (
    !checkRateLimit(rateLimitKey, RATE_LIMITS.loginPerAccount).allowed ||
    !checkRateLimit(ipRateLimitKey, RATE_LIMITS.loginPerIp).allowed
  ) {
    await logAuditEvent({
      eventType: "login.rate_limited",
      ipAddressMasked: ip,
      metadataRedacted: { email: normalizedEmail },
    })
    return { ok: false, reason: "rate_limited" }
  }

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)

  const passwordValid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password)

  if (!user || !passwordValid) {
    await logAuditEvent({
      userId: user?.id,
      eventType: "login.failed",
      ipAddressMasked: ip,
      metadataRedacted: { email: normalizedEmail },
    })
    return { ok: false, reason: "invalid_credentials" }
  }

  if (!user.emailVerifiedAt) {
    await logAuditEvent({ userId: user.id, eventType: "login.unverified_email", ipAddressMasked: ip })
    return { ok: false, reason: "email_not_verified" }
  }

  return { ok: true, user: { id: user.id, email: user.email, displayName: user.displayName } }
}
