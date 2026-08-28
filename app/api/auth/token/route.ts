import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { authenticateWithPassword } from "@/lib/auth/authenticate"
import { createSession } from "@/lib/auth/session-store"
import { getClientIp, maskIpAddress, summarizeUserAgent } from "@/lib/auth/request-info"
import { logAuditEvent } from "@/lib/auth/audit"
import { ensureVaultUnlockSalt } from "@/lib/auth/vault-unlock-salt"

// Native-app login: the Tauri client has no browser cookie jar for a
// NextAuth JWT, so it authenticates here instead and gets back a raw
// bearer token (backed by the same `sessions` table/session-store.ts as
// the cookie-based web login — see lib/auth/authenticate.ts for why the
// actual password check is shared between the two entry points instead of
// duplicated). Not covered by proxy.ts (its matcher never includes
// /api/*), so this route is the only thing standing in front of it —
// authenticateWithPassword's rate limiting/enumeration-safety is what
// protects it, same as the cookie-based path.

const tokenRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // Human-readable label the client computes itself (e.g. via
  // @tauri-apps/plugin-os) since there's no browser User-Agent to parse
  // reliably for a native app — falls back to UA parsing if omitted.
  deviceLabel: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = tokenRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { email, password, deviceLabel } = parsed.data
  const ip = maskIpAddress(getClientIp(request))
  const result = await authenticateWithPassword(email, password, ip)

  if (!result.ok) {
    const status = result.reason === "rate_limited" ? 429 : 401
    const message =
      result.reason === "rate_limited"
        ? "Too many attempts. Try again later."
        : result.reason === "email_not_verified"
          ? "Please verify your email before logging in."
          : "Invalid email or password."
    return NextResponse.json({ error: message }, { status })
  }

  const { user } = result
  const userAgent = summarizeUserAgent(request.headers.get("user-agent"))
  const { sessionId, token } = await createSession(user.id, {
    deviceName: deviceLabel ?? userAgent.deviceName,
    browser: userAgent.browser,
    operatingSystem: userAgent.operatingSystem,
    ipAddressMasked: ip,
  })

  await logAuditEvent({
    userId: user.id,
    eventType: "login.success",
    ipAddressMasked: ip,
    userAgentSummary: deviceLabel ?? userAgent.deviceName,
  })

  // Not secret — see the schema comment on users.vaultUnlockSalt — safe to
  // return alongside the session token. The native app needs it to derive
  // the offline vault-unlock key from the same password the user just typed.
  const vaultUnlockSalt = await ensureVaultUnlockSalt(user.id)

  return NextResponse.json({
    token,
    sessionId,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    vaultUnlockSalt,
  })
}
