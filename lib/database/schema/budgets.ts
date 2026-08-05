import {
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { users } from "./users"
import { expenseCategories } from "./expenses"

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Null categoryId represents the user's total monthly budget.
    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "cascade",
    }),
    month: smallint("month").notNull(),
    year: smallint("year").notNull(),
    limitMinor: integer("limit_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    alertThresholdPercent: smallint("alert_threshold_percent").notNull().default(80),
    rolloverEnabled: boolean("rollover_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("budgets_user_id_idx").on(table.userId),
    // NOTE: Postgres treats NULL as distinct in unique indexes, so this does
    // NOT prevent duplicate total-budget rows (categoryId null) for the same
    // user/month/year. Enforce "at most one total budget per period" in the
    // service layer, or add a partial unique index in a migration:
    //   CREATE UNIQUE INDEX ... ON budgets (user_id, month, year) WHERE category_id IS NULL;
    uniqueIndex("budgets_user_category_month_year_idx").on(
      table.userId,
      table.categoryId,
      table.month,
      table.year,
    ),
  ],
)

export type Budget = typeof budgets.$inferSelect
export type NewBudget = typeof budgets.$inferInsert
