import { addDays, addMonths, addWeeks, addYears } from "date-fns"

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom"

// Occurrence math runs in UTC calendar terms (whatever timezone `from` is
// already in), not per-user local time. The `users` table has a timezone
// column, but wiring occurrence generation through it is deferred — see
// memory: pocket-vault-deferred-phase2. This is a known simplification,
// not an oversight: it means a rule due "at midnight" can land a day off
// for a user far from UTC.
//
// "custom" has no separate unit column in the schema, so it's treated as
// "every `interval` days" — the simplest reading of an otherwise-unspecified
// custom cadence.
export function computeNextOccurrence(from: Date, frequency: RecurrenceFrequency, interval: number): Date {
  const n = Math.max(1, interval)

  switch (frequency) {
    case "daily":
      return addDays(from, n)
    case "weekly":
      return addWeeks(from, n)
    case "monthly":
      // date-fns clamps day-of-month at the target month's length, e.g.
      // Jan 31 + 1 month -> Feb 28 (Feb 29 in a leap year), not Mar 3.
      return addMonths(from, n)
    case "quarterly":
      return addMonths(from, n * 3)
    case "yearly":
      return addYears(from, n)
    case "custom":
      return addDays(from, n)
  }
}
