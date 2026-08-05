"use client"

import { useRouter } from "next/navigation"

import type { ExpenseCategory } from "@/lib/database/schema"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CategoryFilter({
  categories,
  month,
  categoryId,
}: {
  categories: ExpenseCategory[]
  month: string
  categoryId?: string
}) {
  const router = useRouter()

  return (
    <Select
      value={categoryId ?? "all"}
      onValueChange={(value) => {
        const params = new URLSearchParams({ month })
        if (value !== "all") params.set("categoryId", value)
        router.push(`/expenses?${params.toString()}`)
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="All categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All categories</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
