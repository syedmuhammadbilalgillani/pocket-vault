import "server-only"
import { redirect } from "next/navigation"

import { auth } from "@/auth"

// Call this at the top of every server action and route handler that
// touches user-owned data. Middleware alone is not sufficient authorization
// per roadmap 7.3/7.4 — this must run inside the handler itself, and every
// query built from its result must filter by `userId` to prevent one user
// from reaching another user's rows.
//
// This always validates the real session (auth() decrypts the JWT and
// checks lib/auth/session-store.ts for revocation) rather than trusting a
// proxy-injected header. Next.js's own guidance is explicit about why:
// "A matcher change or a refactor that moves a Server Function to a
// different route can silently remove Proxy coverage. Always verify
// authentication and authorization inside each Server Function rather
// than relying on Proxy alone." A header is exactly the kind of proxy-only
// signal that warns against.
export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  return session.user
}
