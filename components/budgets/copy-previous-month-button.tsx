"use client"

import { useTransition } from "react"
import { CopyPlus } from "lucide-react"

import { copyPreviousMonthBudgets } from "@/server/actions/budgets"
import { Button } from "@/components/ui/button"

export function CopyPreviousMonthButton({ month, year }: { month: number; year: number }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => copyPreviousMonthBudgets(month, year))}
    >
      <CopyPlus /> Copy last month&apos;s budgets
    </Button>
  )
}
