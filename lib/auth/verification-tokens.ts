import { randomBytes, createHash } from "node:crypto"
import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { verificationTokens } from "@/lib/database/schema"

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000 // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function createVerificationToken(
  userId: string,
  type: "email_verification" | "password_reset",
) {
  const token = randomBytes(32).toString("base64url")
  const ttl = type === "email_verification" ? EMAIL_VERIFICATION_TTL_MS : PASSWORD_RESET_TTL_MS

  await db.insert(verificationTokens).values({
    userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttl),
  })

  return token
}

// Consumes the token if valid; returns the userId on success. A token can
// only be used once (consumedAt is set immediately) and only within its TTL.
export async function consumeVerificationToken(
  token: string,
  type: "email_verification" | "password_reset",
) {
  const tokenHash = hashToken(token)

  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.type, type),
        isNull(verificationTokens.consumedAt),
      ),
    )
    .limit(1)

  if (!record) return null
  if (record.expiresAt.getTime() < Date.now()) return null

  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, record.id))

  return record.userId
}
