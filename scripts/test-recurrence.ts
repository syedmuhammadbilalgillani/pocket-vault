import assert from "node:assert"

import { computeNextOccurrence } from "@/lib/recurring/next-occurrence"

function d(iso: string) {
  return new Date(iso)
}
function iso(date: Date) {
  return date.toISOString().slice(0, 10)
}

function main() {
  assert.strictEqual(iso(computeNextOccurrence(d("2026-01-01"), "daily", 1)), "2026-01-02")
  assert.strictEqual(iso(computeNextOccurrence(d("2026-01-01"), "weekly", 2)), "2026-01-15")
  console.log("[ok] daily/weekly")

  // End-of-month clamping, non-leap year.
  assert.strictEqual(iso(computeNextOccurrence(d("2026-01-31"), "monthly", 1)), "2026-02-28")
  console.log("[ok] end-of-month clamp (non-leap)")

  // Leap year: Jan 31 + 1 month should land on Feb 29 in a leap year.
  assert.strictEqual(iso(computeNextOccurrence(d("2028-01-31"), "monthly", 1)), "2028-02-29")
  console.log("[ok] leap-year clamp")

  // Quarterly = 3 months, with the same end-of-month clamping.
  assert.strictEqual(iso(computeNextOccurrence(d("2026-11-30"), "quarterly", 1)), "2027-02-28")
  console.log("[ok] quarterly")

  assert.strictEqual(iso(computeNextOccurrence(d("2028-02-29"), "yearly", 1)), "2029-02-28")
  console.log("[ok] yearly leap-day clamp")

  assert.strictEqual(iso(computeNextOccurrence(d("2026-01-01"), "custom", 10)), "2026-01-11")
  console.log("[ok] custom (every N days)")

  // interval must never be treated as 0 or negative.
  assert.strictEqual(iso(computeNextOccurrence(d("2026-01-01"), "daily", 0)), "2026-01-02")
  console.log("[ok] interval floor")

  console.log("\nAll recurrence checks passed.")
}

main()
