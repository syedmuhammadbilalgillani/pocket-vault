import "server-only"
import { and, count, desc, eq, ilike, isNull, isNotNull } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { vaultItems } from "@/lib/database/schema"

export async function countVaultItems(userId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(vaultItems)
    .where(and(eq(vaultItems.userId, userId), isNull(vaultItems.deletedAt)))
  return row?.count ?? 0
}

// Every query here is scoped by userId — this is the enforcement point for
// "the requested record belongs to the authenticated user" (roadmap 7.3).
// Callers must always pass the userId from requireUser(), never a userId
// read from client input.

export async function listVaultItems(userId: string, opts?: { search?: string; categoryId?: string }) {
  const conditions = [eq(vaultItems.userId, userId), isNull(vaultItems.deletedAt)]

  if (opts?.categoryId) {
    conditions.push(eq(vaultItems.categoryId, opts.categoryId))
  }

  if (opts?.search) {
    conditions.push(ilike(vaultItems.title, `%${opts.search}%`))
  }

  return db
    .select()
    .from(vaultItems)
    .where(and(...conditions))
    .orderBy(desc(vaultItems.isFavorite), desc(vaultItems.updatedAt))
}

export async function listTrashedVaultItems(userId: string) {
  return db
    .select()
    .from(vaultItems)
    .where(and(eq(vaultItems.userId, userId), isNotNull(vaultItems.deletedAt)))
    .orderBy(desc(vaultItems.deletedAt))
}

export async function getVaultItem(userId: string, id: string) {
  const [item] = await db
    .select()
    .from(vaultItems)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId), isNull(vaultItems.deletedAt)))
    .limit(1)

  return item ?? null
}

export async function insertVaultItem(
  userId: string,
  values: Omit<typeof vaultItems.$inferInsert, "userId" | "id" | "createdAt" | "updatedAt" | "deletedAt">,
) {
  const [item] = await db
    .insert(vaultItems)
    .values({ userId, ...values })
    .returning()

  return item
}

export async function updateVaultItemRow(
  userId: string,
  id: string,
  values: Partial<typeof vaultItems.$inferInsert>,
) {
  const [item] = await db
    .update(vaultItems)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId), isNull(vaultItems.deletedAt)))
    .returning()

  return item ?? null
}

export async function softDeleteVaultItem(userId: string, id: string) {
  const [item] = await db
    .update(vaultItems)
    .set({ deletedAt: new Date() })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId), isNull(vaultItems.deletedAt)))
    .returning({ id: vaultItems.id })

  return item ?? null
}

export async function restoreVaultItem(userId: string, id: string) {
  const [item] = await db
    .update(vaultItems)
    .set({ deletedAt: null })
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId), isNotNull(vaultItems.deletedAt)))
    .returning({ id: vaultItems.id })

  return item ?? null
}

export async function getTrashedVaultItem(userId: string, id: string) {
  const [item] = await db
    .select()
    .from(vaultItems)
    .where(and(eq(vaultItems.id, id), eq(vaultItems.userId, userId), isNotNull(vaultItems.deletedAt)))
    .limit(1)

  return item ?? null
}
