import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

import { themePreferenceEnum } from "./enums"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Argon2id hash only — never a recoverable/reversible value. See roadmap 7.1.
  passwordHash: text("password_hash").notNull(),
  preferredCurrency: varchar("preferred_currency", { length: 3 }).notNull().default("USD"),
  locale: varchar("locale", { length: 10 }).notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  theme: themePreferenceEnum("theme").notNull().default("system"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  // Tracks whether the one-time default-category seeding has already run,
  // separately from "does this user currently have zero categories" — a
  // user who deletes everything on purpose should stay at zero, not get
  // silently reseeded on their next page load. See
  // ensureDefaultExpenseCategories / ensureDefaultVaultCategories.
  expenseCategoriesSeeded: boolean("expense_categories_seeded").notNull().default(false),
  vaultCategoriesSeeded: boolean("vault_categories_seeded").notNull().default(false),
  // Random, non-secret per-user salt for the native-app's offline vault
  // unlock (Phase 2 of the native-app plan): the client derives a local
  // AES key from this user's login password + this salt (Argon2id,
  // client-side) to wrap a device-local copy of decrypted vault fields for
  // offline viewing. Lazily generated on first native login — see
  // lib/auth/vault-unlock-salt.ts. This is unrelated to and does not
  // change the server-side KEK/DEK envelope model (ADR-001); it only
  // protects the offline cache.
  vaultUnlockSalt: text("vault_unlock_salt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
