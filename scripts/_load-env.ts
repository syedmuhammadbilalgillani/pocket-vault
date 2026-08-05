import { config } from "dotenv"

// Import side effects run in source order across separate import
// statements, so this must be imported before anything that reads
// lib/env.ts (env.ts parses process.env at module-evaluation time).
config({ path: ".env" })
config({ path: ".env.local", override: true })
