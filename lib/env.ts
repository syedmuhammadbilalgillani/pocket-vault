import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Auth.js requires this in production to sign/encrypt JWTs.
  AUTH_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  // VAULT_KEK_V{n} itself is looked up dynamically by lib/crypto/kek.ts
  // (versions are unbounded), but which version is "current" is fixed here.
  VAULT_KEK_CURRENT_VERSION: z.coerce.number().int().positive().default(1),
  // Shared secret for the recurring-transactions scheduled job endpoint —
  // see app/api/cron/recurring/route.ts.
  CRON_SECRET: z.string().min(32).optional(),
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  // An unfilled "" placeholder (e.g. copied from .env.example) should be
  // treated as unset, not as an invalid too-short secret.
  AUTH_SECRET: process.env.AUTH_SECRET || undefined,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VAULT_KEK_CURRENT_VERSION: process.env.VAULT_KEK_CURRENT_VERSION,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
})

if (env.NODE_ENV === "production" && !env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is required in production")
}

if (env.NODE_ENV === "production" && !env.CRON_SECRET) {
  throw new Error("CRON_SECRET is required in production")
}
