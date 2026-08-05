import { NextRequest, NextResponse } from "next/server"

import { isAuthorizedCronRequest } from "@/lib/auth/cron"
import { generateDueTransactions } from "@/server/services/recurring-generator"
import { logAuditEvent } from "@/lib/auth/audit"

// No user session here — this is a system job, authorized by CRON_SECRET
// instead. See the comment on getDueRecurringRules() for why that function
// is the one place allowed to skip userId scoping.
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
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
