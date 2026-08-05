import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

import { env } from "@/lib/env"

const EXPORT_TOKEN_TTL_MS = 2 * 60 * 1000 // 2 minutes — just long enough to trigger the download

// A self-contained, stateless, short-lived token proving "this user just
// reauthenticated for this specific export" — see lib/auth/reauth.ts. No
// server-side storage needed: the expiry is embedded and HMAC-signed, so a
// tampered or expired token is rejected without a database round trip.
// Reuses AUTH_SECRET as the signing key rather than adding another secret
// to configure; this token never leaves the export flow, so that's enough.
type ExportTokenPayload = { userId: string; exportType: string; exp: number }

function sign(payload: string): string {
  const secret = env.AUTH_SECRET ?? "dev-only-export-token-secret-not-for-production-use"
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function createExportToken(userId: string, exportType: string): string {
  const payload: ExportTokenPayload = { userId, exportType, exp: Date.now() + EXPORT_TOKEN_TTL_MS }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encoded}.${sign(encoded)}`
}

export function verifyExportToken(token: string, userId: string, exportType: string): boolean {
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return false

  const expectedSignature = sign(encoded)
  const a = Buffer.from(signature)
  const b = Buffer.from(expectedSignature)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  let payload: ExportTokenPayload
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"))
  } catch {
    return false
  }

  return payload.userId === userId && payload.exportType === exportType && payload.exp > Date.now()
}
