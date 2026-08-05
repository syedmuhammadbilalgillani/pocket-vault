"use client"

import { useState } from "react"

import type { ExpenseCategory } from "@/lib/database/schema"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddCategoryDialog } from "@/components/expenses/add-category-dialog"

// Shared by the transaction form and (indirectly, via the Budgets page)
// budgets — both pick from the same expenseCategories table. New
// categories are user-created (isSystem: false); see
// getOrCreateExpenseCategory.
export function CategorySelect({
  name,
  id,
  categories,
  defaultValue,
  placeholder = "No category",
}: {
  name: string
  id?: string
  categories: ExpenseCategory[]
  defaultValue?: string | null
  placeholder?: string
}) {
  const [localCategories, setLocalCategories] = useState(categories)
  const [value, setValue] = useState(defaultValue ?? undefined)

  return (
    <div className="flex gap-2">
      <Select name={name} value={value} onValueChange={setValue}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {localCategories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AddCategoryDialog
        onCreated={(category) => {
          setLocalCategories((prev) =>
            prev.some((c) => c.id === category.id)
              ? prev
              : [...prev, category as ExpenseCategory].sort((a, b) => a.name.localeCompare(b.name)),
          )
          setValue(category.id)
        }}
      />
    </div>
  )
}
