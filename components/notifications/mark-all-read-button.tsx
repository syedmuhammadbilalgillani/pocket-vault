"use client"

import { useTransition } from "react"
import { CheckCheck } from "lucide-react"

import { markAllRead } from "@/server/actions/notifications"
import { Button } from "@/components/ui/button"

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => markAllRead())}
    >
      <CheckCheck /> Mark all read
    </Button>
  )
}
