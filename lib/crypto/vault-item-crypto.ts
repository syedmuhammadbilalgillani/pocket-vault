import "server-only"

import { getCurrentKek, getKek } from "./kek"
import { generateDek, wrapDek, unwrapDek, encryptWithKey, decryptWithKey } from "./envelope"

export type VaultItemPlaintext = {
  username?: string
  password?: string
  website?: string
  notes?: string
  customFields?: Record<string, string>
}

export type VaultItemEncryptedColumns = {
  encryptedUsername: string | null
  encryptedPassword: string | null
  encryptedWebsite: string | null
  encryptedNotes: string | null
  encryptedCustomFields: string | null
  wrappedDek: string
  encryptionKeyVersion: number
  nonceMetadata: Record<string, string>
}

const FIELD_KEYS = ["username", "password", "website", "notes", "customFields"] as const

// Encrypts every present field with its own fresh DEK, wrapped by the
// current KEK — one DEK per vault item, not per field, matching roadmap
// ADR-001 and the vaultItems schema. Call this once per create/update;
// re-encrypting on update generates a brand new DEK, which is intentional
// (avoids ever reusing a nonce with an old DEK).
export function encryptVaultItem(plaintext: VaultItemPlaintext): VaultItemEncryptedColumns {
  const { version, key: kek } = getCurrentKek()
  const dek = generateDek()

  const nonceMetadata: Record<string, string> = {}
  const encrypted: Record<string, string | null> = {
    encryptedUsername: null,
    encryptedPassword: null,
    encryptedWebsite: null,
    encryptedNotes: null,
    encryptedCustomFields: null,
  }

  for (const field of FIELD_KEYS) {
    const value = plaintext[field]
    if (value === undefined) continue

    const serialized = field === "customFields" ? JSON.stringify(value) : (value as string)
    const { ciphertext, nonce } = encryptWithKey(serialized, dek)

    const columnKey = `encrypted${field[0].toUpperCase()}${field.slice(1)}`
    encrypted[columnKey] = ciphertext
    nonceMetadata[field] = nonce
  }

  return {
    encryptedUsername: encrypted.encryptedUsername,
    encryptedPassword: encrypted.encryptedPassword,
    encryptedWebsite: encrypted.encryptedWebsite,
    encryptedNotes: encrypted.encryptedNotes,
    encryptedCustomFields: encrypted.encryptedCustomFields,
    wrappedDek: wrapDek(dek, kek),
    encryptionKeyVersion: version,
    nonceMetadata,
  }
}

// `fields` limits which columns get decrypted — e.g. a list view that only
// shows title/username shouldn't also decrypt every row's password. Per
// roadmap architecture principles: "keep decrypted vault data in memory for
// the shortest possible time." Omit `fields` to decrypt everything present.
export function decryptVaultItem(
  row: {
    encryptedUsername: string | null
    encryptedPassword: string | null
    encryptedWebsite: string | null
    encryptedNotes: string | null
    encryptedCustomFields: string | null
    wrappedDek: string
    encryptionKeyVersion: number
    nonceMetadata: unknown
  },
  fields?: readonly (typeof FIELD_KEYS)[number][],
): VaultItemPlaintext {
  const kek = getKek(row.encryptionKeyVersion)
  const dek = unwrapDek(row.wrappedDek, kek)
  const nonceMetadata = (row.nonceMetadata ?? {}) as Record<string, string>

  const result: VaultItemPlaintext = {}

  const columns: Record<(typeof FIELD_KEYS)[number], string | null> = {
    username: row.encryptedUsername,
    password: row.encryptedPassword,
    website: row.encryptedWebsite,
    notes: row.encryptedNotes,
    customFields: row.encryptedCustomFields,
  }

  for (const field of fields ?? FIELD_KEYS) {
    const ciphertext = columns[field]
    const nonce = nonceMetadata[field]
    if (ciphertext == null || !nonce) continue

    const plaintext = decryptWithKey({ ciphertext, nonce }, dek)
    if (field === "customFields") {
      result.customFields = JSON.parse(plaintext)
    } else {
      result[field] = plaintext
    }
  }

  return result
}
