import { Suspense } from "react"
import { notFound } from "next/navigation"

import { requireUser } from "@/lib/auth/require-user"
import { getVaultItem } from "@/server/repositories/vault-items"
import { listVaultCategories } from "@/server/repositories/vault-categories"
import { decryptVaultItem } from "@/lib/crypto/vault-item-crypto"
import { VaultItemForm } from "@/components/vault/vault-item-form"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditVaultItemPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Edit credential</h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <EditVaultItemContent params={params} />
      </Suspense>
    </div>
  )
}

async function EditVaultItemContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const item = await getVaultItem(user.id, id)
  if (!item) notFound()

  const categories = await listVaultCategories(user.id)
  // Password is intentionally left out — the form leaves it blank and only
  // re-encrypts if the user types a new one. See vault-item-form.tsx.
  const { username, website, notes } = decryptVaultItem(item, ["username", "website", "notes"])

  return (
    <VaultItemForm
      categories={categories}
      itemId={item.id}
      hasExistingPassword={!!item.encryptedPassword}
      defaultValues={{
        title: item.title,
        categoryId: item.categoryId,
        isFavorite: item.isFavorite,
        username,
        website,
        notes,
      }}
    />
  )
}
