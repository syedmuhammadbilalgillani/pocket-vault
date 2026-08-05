"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

const CLIPBOARD_CLEAR_MS = 20_000

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)

    // Best-effort auto-clear per roadmap 6.2 — only clears if the clipboard
    // still holds exactly what we put there, so we don't stomp on whatever
    // the user copied afterward. Not supported everywhere; fails silently.
    setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText()
        if (current === value) await navigator.clipboard.writeText("")
      } catch {
        // Clipboard read permission denied or unsupported — nothing to do.
      }
    }, CLIPBOARD_CLEAR_MS)
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" onClick={handleCopy} aria-label={`Copy ${label}`}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  )
}
