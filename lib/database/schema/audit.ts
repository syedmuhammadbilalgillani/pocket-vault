import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users"

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Kept even if the account is later deleted, so the audit trail survives
    // account deletion per roadmap 16 (retention/compliance). Do not cascade.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    // Never put decrypted vault data, full tokens, or raw request bodies here.
    // See roadmap 7.6 for the never-log list.
    metadataRedacted: jsonb("metadata_redacted"),
    ipAddressMasked: text("ip_address_masked"),
    userAgentSummary: text("user_agent_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_user_id_idx").on(table.userId),
    index("audit_events_event_type_idx").on(table.eventType),
    index("audit_events_created_at_idx").on(table.createdAt),
  ],
)

export type AuditEvent = typeof auditEvents.$inferSelect
export type NewAuditEvent = typeof auditEvents.$inferInsert
