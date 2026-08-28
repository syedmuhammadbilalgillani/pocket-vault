import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

import { authenticateWithPassword } from "@/lib/auth/authenticate"
import { createSession, getActiveSession, touchSession } from "@/lib/auth/session-store"
import { getClientIp, maskIpAddress, summarizeUserAgent } from "@/lib/auth/request-info"
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
        const result = await authenticateWithPassword(email, password, ip)

        if (!result.ok) {
          if (result.reason === "email_not_verified") throw new EmailNotVerifiedError()
          return null
        }

        const { user } = result
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
