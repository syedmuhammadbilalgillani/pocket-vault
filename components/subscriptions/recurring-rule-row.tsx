"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Pause, Play, Pencil, Trash2 } from "lucide-react"

import type { RecurringRule } from "@/lib/database/schema"
import { togglePauseRecurringRule, deleteRecurringRule } from "@/server/actions/recurring-rules"
import { formatMinor } from "@/lib/money"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
}

export function RecurringRuleRow({
  rule,
  categoryName,
}: {
  rule: RecurringRule
  categoryName?: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{rule.description || "Recurring transaction"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              {FREQUENCY_LABEL[rule.frequency]}
              {rule.interval > 1 ? ` (every ${rule.interval})` : ""}
            </span>
            {categoryName && <Badge variant="secondary">{categoryName}</Badge>}
            {!rule.isActive && <Badge variant="outline">Paused</Badge>}
          </div>
        </div>
        <span className={rule.transactionType === "expense" ? "text-destructive" : "text-primary"}>
          {formatMinor(rule.amountMinor, rule.currency)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={rule.isActive ? "Pause" : "Resume"}
          onClick={() => startTransition(() => togglePauseRecurringRule(rule.id))}
        >
          {rule.isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
          <Link href={`/subscriptions/${rule.id}/edit`}>
            <Pencil className="size-4" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label="Delete"
          onClick={() => startTransition(() => deleteRecurringRule(rule.id))}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
