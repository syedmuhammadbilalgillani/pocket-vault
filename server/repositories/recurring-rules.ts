import "server-only"
import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { recurringRules } from "@/lib/database/schema"

export async function listRecurringRules(userId: string) {
  return db
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.userId, userId))
    .orderBy(asc(recurringRules.nextRunAt))
}

export async function getRecurringRule(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function insertRecurringRule(
  userId: string,
  values: Omit<typeof recurringRules.$inferInsert, "userId" | "id" | "createdAt" | "updatedAt">,
) {
  const [row] = await db
    .insert(recurringRules)
    .values({ userId, ...values })
    .returning()
  return row
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
    .returning()
  return row ?? null
}

export async function deleteRecurringRule(userId: string, id: string) {
  await db.delete(recurringRules).where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
}

// System-level query with NO userId scope, unlike every other repository
// function in this file — intentional. It backs the scheduled-job endpoint
// (app/api/cron/recurring/route.ts), which has no "current user" and must
// process due rules across every account. It must never be called from a
// user-facing request path; that endpoint is protected by CRON_SECRET
// instead of a session.
export async function getDueRecurringRules(asOf: Date) {
  const asOfDate = asOf.toISOString().slice(0, 10) // "YYYY-MM-DD", matches endDate's column type

  return db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.isActive, true),
        lte(recurringRules.nextRunAt, asOf),
        or(isNull(recurringRules.endDate), gte(recurringRules.endDate, asOfDate)),
      ),
    )
}
