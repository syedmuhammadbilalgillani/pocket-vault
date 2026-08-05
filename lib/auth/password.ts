import { hash, verify } from "@node-rs/argon2"

// Argon2id, per roadmap 6.1 "Authentication security". Each hash embeds its
// own salt and parameters, so no separate salt column is needed.
// `2` is Algorithm.Argon2id — imported as a value it trips
// "ambient const enums" under isolatedModules, so it's inlined here instead.
const HASH_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456, // 19 MiB, OWASP minimum recommendation for Argon2id
  timeCost: 2,
  parallelism: 1,
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS)
}

export function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
  return verify(hashedPassword, password)
}
