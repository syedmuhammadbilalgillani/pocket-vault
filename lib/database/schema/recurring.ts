import { boolean, date, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

import { recurrenceFrequencyEnum, transactionTypeEnum } from "./enums"
import { users } from "./users"
import { expenseCategories } from "./expenses"

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionType: transactionTypeEnum("transaction_type").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    frequency: recurrenceFrequencyEnum("frequency").notNull(),
    interval: integer("interval").notNull().default(1),
    startDate: date("start_date").notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    endDate: date("end_date"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("recurring_rules_user_id_idx").on(table.userId),
    index("recurring_rules_next_run_at_idx").on(table.nextRunAt),
  ],
)

export type RecurringRule = typeof recurringRules.$inferSelect
export type NewRecurringRule = typeof recurringRules.$inferInsert
