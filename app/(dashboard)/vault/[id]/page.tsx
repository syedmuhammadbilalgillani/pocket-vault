import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Pencil } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { getVaultItem } from "@/server/repositories/vault-items"
import { listVaultCategories } from "@/server/repositories/vault-categories"
import { decryptVaultItem } from "@/lib/crypto/vault-item-crypto"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RevealSecret } from "@/components/vault/reveal-secret"
import { CopyButton } from "@/components/vault/copy-button"
import { DeleteItemButton } from "@/components/vault/delete-item-button"

// `params` and the session cookie (via requireUser) are both runtime APIs,
// so almost this entire page is per-request content — there's little to
// prerender statically here, but it still follows the same Suspense
// boundary pattern as the rest of the vault module for consistency. See
// app/(dashboard)/vault/page.tsx for the fuller static-shell example.
export default function VaultItemPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<VaultItemSkeleton />}>
      <VaultItemContent params={params} />
    </Suspense>
  )
}

function VaultItemSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

async function VaultItemContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const item = await getVaultItem(user.id, id)
  if (!item) notFound()

  const categories = await listVaultCategories(user.id)
  const categoryName = categories.find((c) => c.id === item.categoryId)?.name

  // Only the username/website/notes are decrypted here on the single-item
  // detail page — the password stays masked until the user explicitly
  // clicks Reveal (components/vault/reveal-secret.tsx).
  const { username, website, notes } = decryptVaultItem(item, ["username", "website", "notes"])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">{item.title}</h1>
          {categoryName && <Badge variant="secondary" className="mt-1">{categoryName}</Badge>}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/vault/${item.id}/edit`}>
            <Pencil /> Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Credentials</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {username && (
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate">{username}</span>
              <CopyButton value={username} label="username" />
            </div>
          )}
          <RevealSecret itemId={item.id} />
          {website && (
            <div className="flex items-center gap-1">
              <a
                href={website}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 flex-1 truncate text-primary underline-offset-4 hover:underline"
              >
                {website}
              </a>
              <CopyButton value={website} label="website" />
            </div>
          )}
          {notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{notes}</p>}
        </CardContent>
      </Card>

      <DeleteItemButton itemId={item.id} />
    </div>
  )
}
