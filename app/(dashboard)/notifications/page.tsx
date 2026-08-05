import { Bell } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { listNotifications } from "@/server/repositories/notifications"
import { Card, CardContent } from "@/components/ui/card"
import { NotificationRow } from "@/components/notifications/notification-row"
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button"

import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <NotificationsContent />
    </Suspense>
  )
}

function NotificationsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

async function NotificationsContent() {
  const user = await requireUser()
  const notifications = await listNotifications(user.id)
  const hasUnread = notifications.some((n) => !n.readAt)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Notifications</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationRow notification={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
