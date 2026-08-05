"use client"

import { useTransition } from "react"
import { Archive } from "lucide-react"

import { archiveFinancialAccountAction } from "@/server/actions/financial-accounts"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ArchiveAccountButton({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Archive ${accountName}`}>
          <Archive className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive &quot;{accountName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            It won&apos;t show up when adding new transactions or transfers, but its history and balance stay
            intact and it isn&apos;t deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => startTransition(() => archiveFinancialAccountAction(accountId))}
          >
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
