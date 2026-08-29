import "server-only";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { vaultCategories, users } from "@/lib/database/schema";

export const listVaultCategories = unstable_cache(
  async (userId: string) => {
    return db
      .select()
      .from(vaultCategories)
      .where(eq(vaultCategories.userId, userId))
      .orderBy(asc(vaultCategories.name));
  },
  ["listVaultCategories"],
  {
    tags: ["vault-module-vault-categories"],
  },
);

export async function getOrCreateVaultCategory(
  userId: string,
  name: string,
  icon?: string,
) {
  const [existing] = await db
    .select()
    .from(vaultCategories)
    .where(
      and(eq(vaultCategories.userId, userId), eq(vaultCategories.name, name)),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(vaultCategories)
    .values({ userId, name, icon })
    .returning();
  revalidateTag("vault-module-vault-categories", "max");
  return created;
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
];

// Seeded exactly once per user, tracked via users.vaultCategoriesSeeded —
// not by "does this user currently have zero categories" (see the same
// fix and rationale in server/repositories/expense-categories.ts).
export async function ensureDefaultVaultCategories(userId: string) {
  const [user] = await db
    .select({ vaultCategoriesSeeded: users.vaultCategoriesSeeded })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.vaultCategoriesSeeded) {
    return listVaultCategories(userId);
  }

  const created = await db
    .insert(vaultCategories)
    .values(SUGGESTED_VAULT_CATEGORIES.map((name) => ({ userId, name })))
    .returning();

  await db.update(users).set({ vaultCategoriesSeeded: true }).where(eq(users.id, userId));

  revalidateTag("vault-module-vault-categories", "max");
  return created;
}

// --- Sync engine support (native-app) ---

// No deletedAt/delete path exists for vault categories today (web or
// native) — they're only ever created, never removed — so this is just a
// plain "created or updated since" query, no tombstone handling needed.
export async function listVaultCategoriesChangedSince(userId: string, since: Date) {
  return db
    .select()
    .from(vaultCategories)
    .where(and(eq(vaultCategories.userId, userId), gt(vaultCategories.updatedAt, since)));
}

// Additive alongside getOrCreateVaultCategory, which stays as-is for the
// web path. LWW/cross-user-safety reasoning matches the other *FromSync
// functions in server/repositories/*.ts.
export async function upsertVaultCategoryFromSync(
  userId: string,
  id: string,
  values: { name: string; icon: string | null },
  clientUpdatedAt: Date,
) {
  const [row] = await db
    .insert(vaultCategories)
    .values({ id, userId, ...values, updatedAt: clientUpdatedAt })
    .onConflictDoUpdate({
      target: vaultCategories.id,
      set: { ...values, updatedAt: clientUpdatedAt },
      setWhere: sql`${vaultCategories.userId} = ${userId} and ${vaultCategories.updatedAt} < ${clientUpdatedAt}`,
    })
    .returning();

  revalidateTag("vault-module-vault-categories", "max");
  return row;
}
