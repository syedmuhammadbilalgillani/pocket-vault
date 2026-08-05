"use client"

import { useTransition } from "react"
import { formatDistanceToNow } from "date-fns"

import type { Notification } from "@/lib/database/schema"
import { markRead } from "@/server/actions/notifications"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function NotificationRow({ notification }: { notification: Notification }) {
  const [pending, startTransition] = useTransition()
  const isUnread = !notification.readAt

  return (
    <Card
      className={cn(isUnread && "ring-1 ring-primary/30")}
      onClick={() => isUnread && !pending && startTransition(() => markRead(notification.id))}
    >
      <CardContent className="flex items-start gap-3 py-3">
        {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm", isUnread && "font-medium")}>{notification.title}</p>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
