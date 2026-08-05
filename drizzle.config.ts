import "dotenv/config"
import { defineConfig } from "drizzle-kit"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/database/schema/index.ts",
  out: "./lib/database/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
})
