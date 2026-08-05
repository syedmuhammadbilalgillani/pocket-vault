import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

import { financialAccountTypeEnum, paymentMethodEnum, transactionTypeEnum } from "./enums"
import { users } from "./users"
import { recurringRules } from "./recurring"

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("expense_categories_user_id_idx").on(table.userId)],
)

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: financialAccountTypeEnum("type").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    // Stored as an integer minor unit (e.g. cents), never a float. See roadmap 8.6.
    openingBalanceMinor: integer("opening_balance_minor").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("financial_accounts_user_id_idx").on(table.userId)],
)

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    // Integer minor units, e.g. cents — never store money as a float.
    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    categoryId: uuid("category_id").references(() => expenseCategories.id, {
      onDelete: "set null",
    }),
    accountId: uuid("account_id").references(() => financialAccounts.id, {
      onDelete: "set null",
    }),
    merchant: text("merchant"),
    description: text("description"),
    // A calendar date, not a timestamp — avoids month/timezone boundary bugs.
    transactionDate: date("transaction_date").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("other"),
    tags: text("tags").array(),
    notes: text("notes"),
    recurringRuleId: uuid("recurring_rule_id").references(() => recurringRules.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_user_id_date_idx").on(table.userId, table.transactionDate),
    index("transactions_category_id_idx").on(table.categoryId),
  ],
)

export type ExpenseCategory = typeof expenseCategories.$inferSelect
export type NewExpenseCategory = typeof expenseCategories.$inferInsert
export type FinancialAccount = typeof financialAccounts.$inferSelect
export type NewFinancialAccount = typeof financialAccounts.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
