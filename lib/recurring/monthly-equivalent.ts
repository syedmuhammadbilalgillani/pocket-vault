import type { RecurrenceFrequency } from "./next-occurrence"

// Approximate monthly-equivalent cost for the "subscription total per
// month" summary — not exact accounting (30/4.345-day averages), just
// enough for an at-a-glance total across mixed cadences.
export function monthlyEquivalentMinor(amountMinor: number, frequency: RecurrenceFrequency, interval: number): number {
  const n = Math.max(1, interval)

  switch (frequency) {
    case "daily":
      return amountMinor * (30 / n)
    case "weekly":
      return amountMinor * (4.345 / n)
    case "monthly":
      return amountMinor / n
    case "quarterly":
      return amountMinor / (n * 3)
    case "yearly":
      return amountMinor / (n * 12)
    case "custom":
      return amountMinor * (30 / n)
  }
}
