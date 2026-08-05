"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff } from "lucide-react"

import { revealVaultItemSecret } from "@/server/actions/vault"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/vault/copy-button"

export function RevealSecret({ itemId }: { itemId: string }) {
  const [password, setPassword] = useState<string>()
  const [revealed, setRevealed] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (revealed) {
      setRevealed(false)
      setPassword(undefined) // don't keep decrypted value in memory once hidden
      return
    }

    startTransition(async () => {
      const result = await revealVaultItemSecret(itemId)
      setPassword(result.password ?? "")
      setRevealed(true)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <span className="min-w-0 flex-1 truncate font-mono text-sm">
        {revealed ? password : "••••••••••••"}
      </span>
      <Button type="button" variant="ghost" size="icon-sm" onClick={toggle} disabled={pending}>
        {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
      {revealed && password && <CopyButton value={password} label="password" />}
    </div>
  )
}
