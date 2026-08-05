import "server-only"
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto"

// AES-256-GCM authenticated encryption throughout, per roadmap 7.2. A
// nonce must never be reused with the same key — randomBytes(12) per call
// makes reuse astronomically unlikely, which is the standard GCM practice.
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export type EncryptedField = { ciphertext: string; nonce: string }

// ciphertext = base64(authTag || encrypted bytes); nonce = base64(iv).
// Kept separate from the DEK-wrapping format below so callers can't
// accidentally cross-use the two.
function encryptWithKey(plaintext: string, key: Buffer): EncryptedField {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    ciphertext: Buffer.concat([authTag, encrypted]).toString("base64"),
    nonce: iv.toString("base64"),
  }
}

function decryptWithKey(field: EncryptedField, key: Buffer): string {
  const iv = Buffer.from(field.nonce, "base64")
  const combined = Buffer.from(field.ciphertext, "base64")
  const authTag = combined.subarray(0, AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")
}

// --- DEK generation and wrapping (envelope encryption, roadmap ADR-001) ---

export function generateDek(): Buffer {
  return randomBytes(32) // AES-256
}

export function wrapDek(dek: Buffer, kek: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, kek, iv)
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()])
  const authTag = cipher.getAuthTag()

  // iv || authTag || encrypted DEK, all in one opaque blob.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64")
}

export function unwrapDek(wrappedDek: string, kek: Buffer): Buffer {
  const combined = Buffer.from(wrappedDek, "base64")
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, kek, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

export { encryptWithKey, decryptWithKey }
