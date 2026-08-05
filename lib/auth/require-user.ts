import "server-only"
import { redirect } from "next/navigation"

import { auth } from "@/auth"

// Call this at the top of every server action and route handler that
// touches user-owned data. Middleware alone is not sufficient authorization
// per roadmap 7.3/7.4 — this must run inside the handler itself, and every
// query built from its result must filter by `userId` to prevent one user
// from reaching another user's rows.
export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  return session.user
}
