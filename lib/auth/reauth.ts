import "server-only"
import { eq } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"
import { verifyPassword } from "@/lib/auth/password"

// Confirms the current password for a sensitive action (export, account
// deletion) per roadmap 6.2/6.9/7.3 "require recent authentication."
//
// This checks the password at the point of the action rather than
// re-establishing a short-lived "recently authenticated" session state, so
// it's a lighter guarantee than a full reauthentication flow (which is
// still deferred — see memory: pocket-vault-deferred-phase2). It's enough
// to stop a hijacked-but-unattended session or a shared device from
// silently exporting/deleting data, which is the immediate risk this closes.
export async function verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return false
  return verifyPassword(user.passwordHash, password)
}
