import { NextRequest, NextResponse } from "next/server"
import { subDays } from "date-fns"

import { isAuthorizedCronRequest } from "@/lib/auth/cron"
import { purgeOldTrashedVaultItems } from "@/server/repositories/vault-items"
import { purgeOldDeletedTransactions } from "@/server/repositories/transactions"
import { logAuditEvent } from "@/lib/auth/audit"

const TRASH_RETENTION_DAYS = 30

// No user session here — see lib/auth/cron.ts. Permanently deletes vault
// items and transactions that have already been soft-deleted for longer
// than the retention window. This is the "retention and deletion jobs"
// task from roadmap Phase 6/16 — until this runs, "delete" only ever
// meant "moved to trash," which is fine for undo but not for someone who
// actually wants their data gone.
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = subDays(new Date(), TRASH_RETENTION_DAYS)

  const [vaultItemsPurged, transactionsPurged] = await Promise.all([
    purgeOldTrashedVaultItems(cutoff),
    purgeOldDeletedTransactions(cutoff),
  ])

  await logAuditEvent({
    eventType: "cron.retention_purge",
    metadataRedacted: { vaultItemsPurged, transactionsPurged, cutoffDays: TRASH_RETENTION_DAYS },
  })

  return NextResponse.json({ vaultItemsPurged, transactionsPurged })
}
