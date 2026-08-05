import { Suspense } from "react"
import Link from "next/link"
import { KeyRound, Plus, Star, Trash2 } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { listVaultItems } from "@/server/repositories/vault-items"
import { ensureDefaultVaultCategories } from "@/server/repositories/vault-categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PasswordConfirmExportButton } from "@/components/exports/password-confirm-export-button"

// The shell below has no dependency on cookies/searchParams, so it
// prerenders as static HTML. Everything that needs the signed-in user
// (requireUser reads the session cookie) or the URL's ?q= is pushed into
// VaultContent, wrapped in Suspense, and streams in at request time. This
// is Partial Prerendering (cacheComponents in next.config.ts) — NOT
// `dynamic = "force-static"`, which would bake one user's data into a
// shared static page. See next.config.ts for why that distinction matters.
export default function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Vault</h1>
          <p className="text-sm text-muted-foreground">Your saved account credentials.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/vault/new">
            <Plus /> Add
          </Link>
        </Button>
      </div>

      <Suspense fallback={<VaultListSkeleton />}>
        <VaultContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function VaultListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-10 w-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

async function VaultContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser()
  const { q } = await searchParams

  const [items, categories] = await Promise.all([
    listVaultItems(user.id, { search: q }),
    ensureDefaultVaultCategories(user.id),
  ])
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  return (
    <>
      <form className="flex gap-2" action="/vault">
        <Input name="q" defaultValue={q} placeholder="Search by title..." className="flex-1" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <KeyRound className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {q ? "No credentials match your search." : "No credentials saved yet."}
            </p>
            {!q && (
              <Button asChild size="sm">
                <Link href="/vault/new">Add your first credential</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/vault/${item.id}`}>
                <Card>
                  <CardContent className="flex items-center gap-3 py-3">
                    <KeyRound className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      {item.categoryId && categoryNameById.has(item.categoryId) && (
                        <Badge variant="secondary" className="mt-1">
                          {categoryNameById.get(item.categoryId)}
                        </Badge>
                      )}
                    </div>
                    {item.isFavorite && (
                      <Star className="size-4 shrink-0 fill-current text-primary" aria-hidden="true" />
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-between">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/vault/trash">
            <Trash2 /> Trash
          </Link>
        </Button>
        <PasswordConfirmExportButton
          exportType="vault"
          label="Export backup"
          description="This downloads an encrypted backup — passwords stay encrypted in the file. Confirm it's you before downloading."
          baseUrl="/api/exports/vault"
        />
      </div>
    </>
  )
}
