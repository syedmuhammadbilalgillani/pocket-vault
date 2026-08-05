import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"
import { verifyPassword } from "@/lib/auth/password"
import { createSession, getActiveSession, touchSession } from "@/lib/auth/session-store"
import { getClientIp, maskIpAddress, summarizeUserAgent } from "@/lib/auth/request-info"
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit"
import { logAuditEvent } from "@/lib/auth/audit"
import "@/lib/auth/types"

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified"
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    // Credentials provider requires JWT sessions (Auth.js constraint).
    // Revocation is layered on top via lib/auth/session-store — see
    // roadmap ADR-005 and the `jwt` callback below. proxy.ts runs on the
    // Node.js runtime by default in this Next.js version (proxy replaces
    // middleware — see node_modules/next/dist/docs), so it can call this
    // full config directly and get a real, DB-backed revocation check.
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days, matches session-store.ts
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data

        const ip = maskIpAddress(getClientIp(request))
        const rateLimitKey = `login:${email.toLowerCase()}`
        const ipRateLimitKey = `login-ip:${ip ?? "unknown"}`

        if (
          !checkRateLimit(rateLimitKey, RATE_LIMITS.loginPerAccount).allowed ||
          !checkRateLimit(ipRateLimitKey, RATE_LIMITS.loginPerIp).allowed
        ) {
          await logAuditEvent({
            eventType: "login.rate_limited",
            ipAddressMasked: ip,
            metadataRedacted: { email },
          })
          return null
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1)

        // A fixed, valid Argon2id hash with no corresponding real password.
        // Used to run a comparison even when the account doesn't exist, so
        // that path doesn't respond measurably faster (account enumeration
        // prevention, roadmap 7.4).
        const DUMMY_HASH =
          "$argon2id$v=19$m=19456,t=2,p=1$m7JXEigh9CPUatCmDxNDSw$r/fbWipfc1H6jKs6QhQwNjAqbqeHAEHZf5Q87caNKKQ"

        const passwordValid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password)

        if (!user || !passwordValid) {
          await logAuditEvent({
            userId: user?.id,
            eventType: "login.failed",
            ipAddressMasked: ip,
            metadataRedacted: { email },
          })
          return null
        }

        if (!user.emailVerifiedAt) {
          await logAuditEvent({
            userId: user.id,
            eventType: "login.unverified_email",
            ipAddressMasked: ip,
          })
          throw new EmailNotVerifiedError()
        }

        const userAgent = summarizeUserAgent(request.headers.get("user-agent"))
        const { token } = await createSession(user.id, { ...userAgent, ipAddressMasked: ip })

        await logAuditEvent({
          userId: user.id,
          eventType: "login.success",
          ipAddressMasked: ip,
          userAgentSummary: userAgent.deviceName,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          sessionToken: token,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.sessionToken) {
        token.sessionToken = user.sessionToken
        token.sub = user.id
        return token
      }

      const sessionToken = token.sessionToken as string | undefined
      if (!sessionToken) return null

      const session = await getActiveSession(sessionToken)
      if (!session) return null // revoked, expired, or not found — logs the user out

      // Best-effort activity tracking; not throttled yet, see session-store.ts.
      await touchSession(session.id)

      return token
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
})
