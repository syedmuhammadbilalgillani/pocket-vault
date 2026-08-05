"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AddCategoryDialog } from "@/components/expenses/add-category-dialog"

// Budgets page fetches its category list server-side, so after creating a
// category here the simplest way to make it show up as a new row is a
// full route refresh — there's no local list to splice into like
// CategorySelect has.
export function AddBudgetCategoryButton() {
  const router = useRouter()

  return (
    <AddCategoryDialog
      onCreated={() => router.refresh()}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Plus /> Add category
        </Button>
      }
    />
  )
}
