"use client"

import { useTransition } from "react"
import { RotateCcw } from "lucide-react"

import { restoreVaultItem } from "@/server/actions/vault"
import { Button } from "@/components/ui/button"

export function RestoreItemButton({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => restoreVaultItem(itemId))}
    >
      <RotateCcw /> Restore
    </Button>
  )
}
