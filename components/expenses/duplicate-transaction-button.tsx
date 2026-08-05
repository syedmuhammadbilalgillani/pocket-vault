"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy } from "lucide-react"

import { duplicateTransaction } from "@/server/actions/transactions"
import { Button } from "@/components/ui/button"

export function DuplicateTransactionButton({ transactionId }: { transactionId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Duplicate transaction"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const newId = await duplicateTransaction(transactionId)
          router.push(`/expenses/${newId}/edit`)
        })
      }
    >
      <Copy className="size-4" />
    </Button>
  )
}
