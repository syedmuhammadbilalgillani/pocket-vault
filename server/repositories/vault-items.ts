import "server-only";
import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  isNull,
  isNotNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { vaultItems } from "@/lib/database/schema";
import { encryptVaultItem, decryptVaultItem, type VaultItemPlaintext } from "@/lib/crypto/vault-item-crypto";

export const countVaultItems = unstable_cache(
  async (userId: string) => {
    const [row] = await db
      .select({ count: count() })
      .from(vaultItems)
      .where(and(eq(vaultItems.userId, userId), isNull(vaultItems.deletedAt)));
    return row?.count ?? 0;
  },
  ["countVaultItems"],
  {
    tags: ["vault-module-vault-items"],
  },
);

// Every query here is scoped by userId — this is the enforcement point for
// "the requested record belongs to the authenticated user" (roadmap 7.3).
// Callers must always pass the userId from requireUser(), never a userId
// read from client input.

export const listVaultItems = unstable_cache(
  async (userId: string, opts?: { search?: string; categoryId?: string }) => {
    const conditions = [
      eq(vaultItems.userId, userId),
      isNull(vaultItems.deletedAt),
    ];

    if (opts?.categoryId) {
      conditions.push(eq(vaultItems.categoryId, opts.categoryId));
    }

    if (opts?.search) {
      conditions.push(ilike(vaultItems.title, `%${opts.search}%`));
    }

    return db
      .select()
      .from(vaultItems)
      .where(and(...conditions))
      .orderBy(desc(vaultItems.isFavorite), desc(vaultItems.updatedAt));
  },
  ["listVaultItems"],
  {
    tags: ["vault-module-vault-items"],
  },
);

export const listTrashedVaultItems = unstable_cache(
  async (userId: string) => {
    return db
      .select()
      .from(vaultItems)
      .where(
        and(eq(vaultItems.userId, userId), isNotNull(vaultItems.deletedAt)),
      )
      .orderBy(desc(vaultItems.deletedAt));
  },
  ["listTrashedVaultItems"],
  {
    tags: ["vault-module-vault-items"],
  },
);

export const getVaultItem = unstable_cache(
  async (userId: string, id: string) => {
    const [item] = await db
      .select()
      .from(vaultItems)
      .where(
        and(
          eq(vaultItems.id, id),
          eq(vaultItems.userId, userId),
          isNull(vaultItems.deletedAt),
        ),
      )
      .limit(1);

    return item ?? null;
  },
  ["getVaultItem"],
  {
    tags: ["vault-module-vault-items"],
  },
);

export async function insertVaultItem(
  userId: string,
  values: Omit<
    typeof vaultItems.$inferInsert,
    "userId" | "id" | "createdAt" | "updatedAt" | "deletedAt"
  >,
) {
  const [item] = await db
    .insert(vaultItems)
    .values({ userId, ...values })
    .returning();

  revalidateTag("vault-module-vault-items", "max");
  return item;
}

export async function updateVaultItemRow(
  userId: string,
  id: string,
  values: Partial<typeof vaultItems.$inferInsert>,
) {
  const [item] = await db
    .update(vaultItems)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(vaultItems.id, id),
        eq(vaultItems.userId, userId),
        isNull(vaultItems.deletedAt),
      ),
    )
    .returning();

  revalidateTag("vault-module-vault-items", "max");
  return item ?? null;
}

export async function softDeleteVaultItem(userId: string, id: string) {
  const [item] = await db
    .update(vaultItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(vaultItems.id, id),
        eq(vaultItems.userId, userId),
        isNull(vaultItems.deletedAt),
      ),
    )
    .returning({ id: vaultItems.id });

  revalidateTag("vault-module-vault-items", "max");
  return item ?? null;
}

export async function restoreVaultItem(userId: string, id: string) {
  const [item] = await db
    .update(vaultItems)
    .set({ deletedAt: null })
    .where(
      and(
        eq(vaultItems.id, id),
        eq(vaultItems.userId, userId),
        isNotNull(vaultItems.deletedAt),
      ),
    )
    .returning({ id: vaultItems.id });

  revalidateTag("vault-module-vault-items", "max");
  return item ?? null;
}

export const getTrashedVaultItem = unstable_cache(
  async (userId: string, id: string) => {
    const [item] = await db
      .select()
      .from(vaultItems)
      .where(
        and(
          eq(vaultItems.id, id),
          eq(vaultItems.userId, userId),
          isNotNull(vaultItems.deletedAt),
        ),
      )
      .limit(1);

    return item ?? null;
  },
  ["getTrashedVaultItem"],
  {
    tags: ["vault-module-vault-items"],
  },
);

// --- Sync engine support (native-app, Phase 2) ---

// Unlike the other *ChangedSince functions (financial-accounts.ts etc.),
// this one decrypts before returning — the native app receives plaintext
// over this authenticated HTTPS call and re-encrypts it locally under a
// password-derived key for offline storage (see the plan's Phase 2 design
// and the schema comment on users.vaultUnlockSalt). The server's own
// KEK/DEK envelope model (ADR-001) is what decrypts here; it is
// unchanged by this — this is just a second consumer of decryptVaultItem,
// the same function revealVaultItemSecret already calls.
export async function listVaultItemsChangedSince(userId: string, since: Date) {
  const rows = await db
    .select()
    .from(vaultItems)
    .where(
      and(eq(vaultItems.userId, userId), or(gt(vaultItems.updatedAt, since), gt(vaultItems.deletedAt, since))),
    );

  return rows.map((row) => {
    // A soft-deleted row's ciphertext may already be gone by the time this
    // runs (retention purge) — only decrypt when there's something to
    // decrypt; the client just needs the tombstone either way.
    const plaintext = row.deletedAt ? {} : decryptVaultItem(row, ["username", "password", "website", "notes"]);
    return {
      id: row.id,
      title: row.title,
      categoryId: row.categoryId,
      isFavorite: row.isFavorite,
      passwordChangedAt: row.passwordChangedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      username: plaintext.username ?? null,
      password: plaintext.password ?? null,
      website: plaintext.website ?? null,
      notes: plaintext.notes ?? null,
    };
  });
}

// Additive alongside createVaultItem/updateVaultItem's server actions,
// which stay as-is for the existing web path. Takes plaintext (the native
// app never holds a wrappedDek or the server's KEK) and encrypts it here
// with a fresh DEK, exactly like those actions do — see
// lib/crypto/vault-item-crypto.ts. LWW/cross-user-safety reasoning matches
// the other *FromSync functions in server/repositories/*.ts.
export async function upsertVaultItemFromSync(
  userId: string,
  id: string,
  fields: { title: string; categoryId: string | null; isFavorite: boolean; passwordChangedAt: Date | null },
  plaintext: VaultItemPlaintext,
  clientUpdatedAt: Date,
) {
  const encrypted = encryptVaultItem(plaintext);
  const values = { ...fields, ...encrypted, updatedAt: clientUpdatedAt };

  const [row] = await db
    .insert(vaultItems)
    .values({ id, userId, ...values })
    .onConflictDoUpdate({
      target: vaultItems.id,
      set: values,
      setWhere: sql`${vaultItems.userId} = ${userId} and ${vaultItems.updatedAt} < ${clientUpdatedAt}`,
    })
    .returning({ id: vaultItems.id });

  revalidateTag("vault-module-vault-items", "max");
  return row;
}

// System-level, no userId scope — intentional, same exception as
// getDueRecurringRules(). Backs the retention cron job
// (app/api/cron/retention/route.ts), which permanently purges vault items
// that have sat in trash past the retention window, across every account.
export async function purgeOldTrashedVaultItems(olderThan: Date) {
  const deleted = await db
    .delete(vaultItems)
    .where(
      and(isNotNull(vaultItems.deletedAt), lt(vaultItems.deletedAt, olderThan)),
    )
    .returning({ id: vaultItems.id });

  revalidateTag("vault-module-vault-items", "max");
  return deleted.length;
}
