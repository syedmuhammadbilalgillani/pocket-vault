import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users"

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Only the hash of a >=256-bit random token is ever stored. See roadmap ADR-003.
    tokenHash: text("token_hash").notNull().unique(),
    deviceName: text("device_name"),
    browser: text("browser"),
    operatingSystem: text("operating_system"),
    ipAddressMasked: text("ip_address_masked"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
)

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
