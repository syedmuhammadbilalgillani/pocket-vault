import "server-only"
import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"

import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"

// Lazily generates and persists this user's vaultUnlockSalt on first native
// login, rather than at registration — most accounts will never install
// the native app, so there's no reason every registration pays for it.
// Not a secret: it just has to be unique per user and never change once
// set (changing it would silently break every device's ability to derive
// the same local unlock key). See the schema comment on
// users.vaultUnlockSalt for what this actually protects.
export async function ensureVaultUnlockSalt(userId: string): Promise<string> {
  const [user] = await db
    .select({ vaultUnlockSalt: users.vaultUnlockSalt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (user?.vaultUnlockSalt) return user.vaultUnlockSalt

  const salt = randomBytes(16).toString("base64url")
  await db.update(users).set({ vaultUnlockSalt: salt }).where(eq(users.id, userId))
  return salt
}
