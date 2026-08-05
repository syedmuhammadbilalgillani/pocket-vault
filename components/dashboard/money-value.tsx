"use client"

import { usePrivacy } from "@/components/dashboard/privacy-context"
import { formatMinor } from "@/lib/money"

export function MoneyValue({ amountMinor, className }: { amountMinor: number; className?: string }) {
  const { hidden } = usePrivacy()
  return <span className={className}>{hidden ? "••••••" : formatMinor(amountMinor)}</span>
}
