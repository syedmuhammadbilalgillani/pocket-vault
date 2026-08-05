import { db } from "@/lib/database/connection"
import { auditEvents } from "@/lib/database/schema"

// metadata must already be redacted by the caller — never pass passwords,
// tokens, or decrypted vault data here. See roadmap 7.6.
export async function logAuditEvent(params: {
  userId?: string | null
  eventType: string
  metadataRedacted?: Record<string, unknown>
  ipAddressMasked?: string
  userAgentSummary?: string
}) {
  await db.insert(auditEvents).values({
    userId: params.userId ?? null,
    eventType: params.eventType,
    metadataRedacted: params.metadataRedacted,
    ipAddressMasked: params.ipAddressMasked,
    userAgentSummary: params.userAgentSummary,
  })
}
