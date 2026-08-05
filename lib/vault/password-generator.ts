// Runs entirely client-side — no server round trip, no stored secret
// touched. Uses Web Crypto (crypto.getRandomValues), not Math.random.

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
}
const AMBIGUOUS = /[Il1O0]/

export type PasswordGeneratorOptions = {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export const DEFAULT_GENERATOR_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
}

export function generatePassword(options: PasswordGeneratorOptions): string {
  let pool = ""
  if (options.lowercase) pool += CHARSETS.lowercase
  if (options.uppercase) pool += CHARSETS.uppercase
  if (options.numbers) pool += CHARSETS.numbers
  if (options.symbols) pool += CHARSETS.symbols

  if (options.excludeAmbiguous) {
    pool = [...pool].filter((c) => !AMBIGUOUS.test(c)).join("")
  }

  if (!pool) return ""

  const values = new Uint32Array(options.length)
  crypto.getRandomValues(values)

  return Array.from(values, (v) => pool[v % pool.length]).join("")
}

// Rough heuristic, not a full entropy estimator — good enough for UI
// feedback without adding a zxcvbn-sized dependency.
export function estimatePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong"
} {
  if (!password) return { score: 0, label: "Very weak" }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 14) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"] as const
  return { score: clamped, label: labels[clamped] }
}
