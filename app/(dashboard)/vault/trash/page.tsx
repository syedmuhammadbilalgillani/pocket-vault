import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { listTrashedVaultItems } from "@/server/repositories/vault-items"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RestoreItemButton } from "@/components/vault/restore-item-button"

export default async function VaultTrashPage() {
  const user = await requireUser()
  const items = await listTrashedVaultItems(user.id)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/vault" aria-label="Back to vault">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="font-heading text-xl font-semibold">Trash</h1>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Trash2 className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Trash is empty.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <RestoreItemButton itemId={item.id} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
