import "server-only"

import { getActiveSession, touchSession } from "@/lib/auth/session-store"

// Bearer-token equivalent of lib/auth/require-user.ts, for the native-app
// sync API (app/api/sync/*), which has no browser cookie jar to read a
// NextAuth JWT from. Uses the exact same session-revocation check as the
// cookie-based flow (auth.ts's `jwt` callback) — getActiveSession() is the
// single source of truth for "is this session still valid" either way.
//
// proxy.ts's matcher never covers /api/*, so every route calling this must
// perform this check itself (roadmap 7.3/7.4) — same pattern already used
// by /api/exports and /api/cron.
export async function requireBearerUser(request: Request): Promise<
  { ok: true; userId: string } | { ok: false; status: 401; message: string }
> {
  const header = request.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null

  if (!token) {
    return { ok: false, status: 401, message: "Missing bearer token" }
  }

  const session = await getActiveSession(token)
  if (!session) {
    return { ok: false, status: 401, message: "Invalid or expired session" }
  }

  await touchSession(session.id)
  return { ok: true, userId: session.userId }
}
