import "server-only"
import { timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"

import { env } from "@/lib/env"

// Shared by every /api/cron/* route — none of them have a user session, so
// this Bearer-token check (constant-time, per roadmap 7.4) is the only
// authorization they get. Never call this from a user-facing request path.
export function isAuthorizedCronRequest(request: NextRequest): boolean {
  if (!env.CRON_SECRET) return false // never allow an unconfigured secret through

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const expected = env.CRON_SECRET

  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}
