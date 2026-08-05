import "server-only"

import { env } from "@/lib/env"

const KEK_BYTE_LENGTH = 32 // AES-256

const kekCache = new Map<number, Buffer>()

// Loads the Key Encryption Key for a given version from
// VAULT_KEK_V{version}, per roadmap ADR-002. Local dev only — in
// staging/production this must be swapped for a managed KMS lookup instead
// of an env var, without changing anything that calls this function.
export function getKek(version: number): Buffer {
  const cached = kekCache.get(version)
  if (cached) return cached

  const raw = process.env[`VAULT_KEK_V${version}`]
  if (!raw) {
    throw new Error(`Missing VAULT_KEK_V${version} — vault encryption key not configured`)
  }

  const key = Buffer.from(raw, "base64")
  if (key.length !== KEK_BYTE_LENGTH) {
    throw new Error(
      `VAULT_KEK_V${version} must decode to ${KEK_BYTE_LENGTH} bytes, got ${key.length}`,
    )
  }

  kekCache.set(version, key)
  return key
}

export function getCurrentKek(): { version: number; key: Buffer } {
  const version = env.VAULT_KEK_CURRENT_VERSION
  return { version, key: getKek(version) }
}
