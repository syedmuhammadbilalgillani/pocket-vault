import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { env } from "@/lib/env"
import { generateDueTransactions } from "@/server/services/recurring-generator"
import { logAuditEvent } from "@/lib/auth/audit"

function isAuthorized(request: NextRequest): boolean {
  if (!env.CRON_SECRET) return false // never allow an unconfigured secret through

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const expected = env.CRON_SECRET

  // Constant-time comparison — a plain `===` would let an attacker recover
  // the secret byte-by-byte via response-timing differences.
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}

// No user session here — this is a system job, authorized by CRON_SECRET
// instead. See the comment on getDueRecurringRules() for why that function
// is the one place allowed to skip userId scoping.
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await generateDueTransactions(new Date())

  // Per roadmap 7.5: log the job ran and its counts, never the generated
  // transactions' own financial details.
  await logAuditEvent({
    eventType: "cron.recurring_generated",
    metadataRedacted: {
      generated: result.generated,
      skippedDuplicates: result.skippedDuplicates,
      remindersSent: result.remindersSent,
      failureCount: result.failures.length,
    },
  })

  return NextResponse.json(result)
}
