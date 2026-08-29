import "server-only";
import { and, asc, eq, gt, gte, isNull, lte, or, sql } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { recurringRules } from "@/lib/database/schema";

export const listRecurringRules = unstable_cache(
  async (userId: string) => {
    return db
      .select()
      .from(recurringRules)
      .where(and(eq(recurringRules.userId, userId), isNull(recurringRules.deletedAt)))
      .orderBy(asc(recurringRules.nextRunAt));
  },
  ["listRecurringRules"],
  {
    tags: ["vault-module-recurring-rules"],
  },
);

export const getRecurringRule = unstable_cache(
  async (userId: string, id: string) => {
    const [row] = await db
      .select()
      .from(recurringRules)
      .where(
        and(
          eq(recurringRules.id, id),
          eq(recurringRules.userId, userId),
          isNull(recurringRules.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  },
  ["getRecurringRule"],
  {
    tags: ["vault-module-recurring-rules"],
  },
);

export async function insertRecurringRule(
  userId: string,
  values: Omit<
    typeof recurringRules.$inferInsert,
    "userId" | "id" | "createdAt" | "updatedAt"
  >,
) {
  const [row] = await db
    .insert(recurringRules)
    .values({ userId, ...values })
    .returning();

  revalidateTag("vault-module-recurring-rules", "max");
  return row;
}

export async function updateRecurringRule(
  userId: string,
  id: string,
  values: Partial<typeof recurringRules.$inferInsert>,
) {
  const [row] = await db
    .update(recurringRules)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
    .returning();

  revalidateTag("vault-module-recurring-rules", "max");
  return row ?? null;
}

// Soft-delete — see the deletedAt comment in
// lib/database/schema/recurring.ts. Also flips isActive off so
// getDueRecurringRules (which the cron job uses and doesn't otherwise
// filter on deletedAt, see below) can't generate transactions from it in
// the gap before that query is ever hit again.
export async function deleteRecurringRule(userId: string, id: string) {
  await db
    .update(recurringRules)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  revalidateTag("vault-module-recurring-rules", "max");
}

// System-level query with NO userId scope, unlike every other repository
// function in this file — intentional. It backs the scheduled-job endpoint
// (app/api/cron/recurring/route.ts), which has no "current user" and must
// process due rules across every account. It must never be called from a
// user-facing request path; that endpoint is protected by CRON_SECRET
// instead of a session.
export async function getDueRecurringRules(asOf: Date) {
  const asOfDate = asOf.toISOString().slice(0, 10); // "YYYY-MM-DD", matches endDate's column type

  return db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.isActive, true),
        isNull(recurringRules.deletedAt),
        lte(recurringRules.nextRunAt, asOf),
        or(
          isNull(recurringRules.endDate),
          gte(recurringRules.endDate, asOfDate),
        ),
      ),
    );
}

// --- Sync engine support (native-app) ---

export async function listRecurringRulesChangedSince(userId: string, since: Date) {
  return db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        or(gt(recurringRules.updatedAt, since), gt(recurringRules.deletedAt, since)),
      ),
    );
}

// Additive alongside insertRecurringRule/updateRecurringRule, which stay
// as-is for the existing web Server Action path — see the matching
// function in financial-accounts.ts for the LWW/cross-user-safety
// reasoning.
export async function upsertRecurringRuleFromSync(
  userId: string,
  id: string,
  values: Omit<typeof recurringRules.$inferInsert, "id" | "userId">,
  clientUpdatedAt: Date,
) {
  const [row] = await db
    .insert(recurringRules)
    .values({ id, userId, ...values, updatedAt: clientUpdatedAt })
    .onConflictDoUpdate({
      target: recurringRules.id,
      set: { ...values, updatedAt: clientUpdatedAt },
      setWhere: sql`${recurringRules.userId} = ${userId} and ${recurringRules.updatedAt} < ${clientUpdatedAt}`,
    })
    .returning();

  revalidateTag("vault-module-recurring-rules", "max");
  return row;
}
