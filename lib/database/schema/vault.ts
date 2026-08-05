import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { users } from "./users"

export const vaultCategories = pgTable(
  "vault_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("vault_categories_user_id_idx").on(table.userId)],
)

export const vaultTags = pgTable(
  "vault_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [index("vault_tags_user_id_idx").on(table.userId)],
)

export const vaultItems = pgTable(
  "vault_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    categoryId: uuid("category_id").references(() => vaultCategories.id, {
      onDelete: "set null",
    }),
    // All ciphertext below is authenticated-encryption output (AES-256-GCM),
    // base64 encoded. Plaintext must never reach this table. See roadmap 7.2.
    encryptedUsername: text("encrypted_username"),
    encryptedPassword: text("encrypted_password"),
    encryptedWebsite: text("encrypted_website"),
    encryptedNotes: text("encrypted_notes"),
    encryptedCustomFields: text("encrypted_custom_fields"),
    // Envelope encryption per roadmap ADR-001: this record's DEK, wrapped by
    // the KEK version named in encryptionKeyVersion. Never store a raw DEK.
    wrappedDek: text("wrapped_dek").notNull(),
    encryptionKeyVersion: integer("encryption_key_version").notNull(),
    // Per-field nonces/IVs used for each encrypted_* column, e.g.
    // { username: "...", password: "...", website: "...", notes: "...", customFields: "..." }.
    // A nonce must never be reused with the same DEK.
    nonceMetadata: jsonb("nonce_metadata").notNull(),
    isFavorite: boolean("is_favorite").notNull().default(false),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("vault_items_user_id_idx").on(table.userId),
    index("vault_items_category_id_idx").on(table.categoryId),
  ],
)

export const vaultItemTags = pgTable(
  "vault_item_tags",
  {
    vaultItemId: uuid("vault_item_id")
      .notNull()
      .references(() => vaultItems.id, { onDelete: "cascade" }),
    vaultTagId: uuid("vault_tag_id")
      .notNull()
      .references(() => vaultTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.vaultItemId, table.vaultTagId] }),
    index("vault_item_tags_tag_id_idx").on(table.vaultTagId),
  ],
)

export type VaultCategory = typeof vaultCategories.$inferSelect
export type NewVaultCategory = typeof vaultCategories.$inferInsert
export type VaultTag = typeof vaultTags.$inferSelect
export type NewVaultTag = typeof vaultTags.$inferInsert
export type VaultItem = typeof vaultItems.$inferSelect
export type NewVaultItem = typeof vaultItems.$inferInsert
