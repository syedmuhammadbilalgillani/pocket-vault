import "server-only";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";

import { db } from "@/lib/database/connection";
import { notifications } from "@/lib/database/schema";

export const listNotifications = unstable_cache(
  async (userId: string) => {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  },
  ["listNotifications"],
  {
    tags: ["vault-module-notifications"],
  },
);

export const countUnreadNotifications = unstable_cache(
  async (userId: string) => {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );
    return rows.length;
  },
  ["countUnreadNotifications"],
  {
    tags: ["vault-module-notifications"],
  },
);

export async function markNotificationRead(userId: string, id: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

  revalidateTag("vault-module-notifications", "max");
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  revalidateTag("vault-module-notifications", "max");
}

export async function insertNotification(
  userId: string,
  values: Pick<typeof notifications.$inferInsert, "type" | "title" | "message">,
) {
  const [row] = await db
    .insert(notifications)
    .values({ userId, ...values })
    .returning();

  revalidateTag("vault-module-notifications", "max");
  return row;
}

// Dedup check for reminder notifications, which have no natural foreign key
// back to the recurring rule that triggered them (the notifications schema
// is generic — see roadmap 8.12). Matching on title + a recent time window
// is a heuristic, not a hard guarantee, but keeps the cron job idempotent
// enough that retries won't spam a user with the same reminder.
export async function hasRecentNotification(
  userId: string,
  title: string,
  sinceHoursAgo: number,
) {
  const since = new Date(Date.now() - sinceHoursAgo * 60 * 60 * 1000);
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.title, title),
        gte(notifications.createdAt, since),
      ),
    )
    .limit(1);
  return !!row;
}
