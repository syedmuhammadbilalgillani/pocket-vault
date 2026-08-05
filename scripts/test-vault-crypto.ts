import "./_load-env"
import assert from "node:assert"

import { encryptVaultItem, decryptVaultItem } from "@/lib/crypto/vault-item-crypto"
import { wrapDek, unwrapDek, generateDek } from "@/lib/crypto/envelope"
import { getKek } from "@/lib/crypto/kek"

function main() {
  // Round trip
  const plaintext = {
    username: "alice@example.com",
    password: "correct horse battery staple",
    website: "https://example.com",
    notes: "some secure note",
    customFields: { securityQuestion: "pet name", answer: "rex" },
  }
  const encrypted = encryptVaultItem(plaintext)
  assert.notStrictEqual(encrypted.encryptedPassword, plaintext.password, "password must not be stored in plaintext")

  const decrypted = decryptVaultItem(encrypted)
  assert.deepStrictEqual(decrypted, plaintext, "round trip should return the original plaintext")
  console.log("[ok] round trip")

  // Wrong-key failure
  const dek = generateDek()
  const kek1 = getKek(1)
  const fakeKek = Buffer.alloc(32, 7)
  const wrapped = wrapDek(dek, kek1)
  assert.throws(() => unwrapDek(wrapped, fakeKek), "unwrapping with the wrong KEK must fail")
  console.log("[ok] wrong-key failure")

  // Tampered-ciphertext failure
  const tampered = { ...encrypted }
  const buf = Buffer.from(tampered.encryptedPassword!, "base64")
  buf[buf.length - 1] ^= 0xff // flip a bit
  tampered.encryptedPassword = buf.toString("base64")
  assert.throws(() => decryptVaultItem(tampered), "decrypting tampered ciphertext must fail")
  console.log("[ok] tampered-ciphertext failure")

  console.log("\nAll vault crypto checks passed.")
}

main()
