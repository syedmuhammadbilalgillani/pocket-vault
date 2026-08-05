"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/server/repositories/notifications";

export async function markRead(id: string) {
  const user = await requireUser();
  await markNotificationRead(user.id, id);
  revalidateTag("vault-module-notifications", "max");
  revalidatePath("/notifications");
}

export async function markAllRead() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidateTag("vault-module-notifications", "max");
  revalidatePath("/notifications");
}
