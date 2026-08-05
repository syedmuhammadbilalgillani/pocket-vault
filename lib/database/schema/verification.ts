import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { verificationTokenTypeEnum } from "./enums"
import { users } from "./users"

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: verificationTokenTypeEnum("type").notNull(),
    // Only the hash of the raw token is stored, same pattern as sessions.
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verification_tokens_user_id_idx").on(table.userId),
    index("verification_tokens_type_idx").on(table.type),
  ],
)

export type VerificationToken = typeof verificationTokens.$inferSelect
export type NewVerificationToken = typeof verificationTokens.$inferInsert
