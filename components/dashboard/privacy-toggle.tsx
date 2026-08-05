"use client"

import { Eye, EyeOff } from "lucide-react"

import { usePrivacy } from "@/components/dashboard/privacy-context"
import { Button } from "@/components/ui/button"

export function PrivacyToggle() {
  const { hidden, toggle } = usePrivacy()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={hidden ? "Show balances" : "Hide balances"}
    >
      {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </Button>
  )
}
