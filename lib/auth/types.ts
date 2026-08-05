import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    sessionToken?: string
  }
}

// Not augmenting the JWT interface here: it lives in "next-auth/jwt", which
// re-exports from "@auth/core/jwt" — a transitive dependency that pnpm's
// strict node_modules layout doesn't hoist, so TS can't resolve it for
// module augmentation. token.sessionToken is read with a local cast in
// auth.ts instead (JWT already extends Record<string, unknown>).
