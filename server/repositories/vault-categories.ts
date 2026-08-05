import "server-only"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { vaultCategories } from "@/lib/database/schema"

export async function listVaultCategories(userId: string) {
  return db
    .select()
    .from(vaultCategories)
    .where(eq(vaultCategories.userId, userId))
    .orderBy(asc(vaultCategories.name))
}

export async function getOrCreateVaultCategory(userId: string, name: string, icon?: string) {
  const [existing] = await db
    .select()
    .from(vaultCategories)
    .where(and(eq(vaultCategories.userId, userId), eq(vaultCategories.name, name)))
    .limit(1)

  if (existing) return existing

  const [created] = await db.insert(vaultCategories).values({ userId, name, icon }).returning()
  return created
}

// Suggested categories from roadmap 6.2. Seeded lazily per user on first
// vault visit rather than at registration, so a user who never opens the
// vault doesn't get rows they'll never use.
export const SUGGESTED_VAULT_CATEGORIES = [
  "Email",
  "Social media",
  "Work",
  "Banking",
  "Shopping",
  "Entertainment",
  "Education",
  "Utilities",
  "Other",
]

export async function ensureDefaultVaultCategories(userId: string) {
  const existing = await listVaultCategories(userId)
  if (existing.length > 0) return existing

  const created = await db
    .insert(vaultCategories)
    .values(SUGGESTED_VAULT_CATEGORIES.map((name) => ({ userId, name })))
    .returning()

  return created
}
