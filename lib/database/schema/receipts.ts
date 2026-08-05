import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users"
import { transactions } from "./expenses"

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("receipts_user_id_idx").on(table.userId),
    index("receipts_transaction_id_idx").on(table.transactionId),
  ],
)

export type Receipt = typeof receipts.$inferSelect
export type NewReceipt = typeof receipts.$inferInsert
