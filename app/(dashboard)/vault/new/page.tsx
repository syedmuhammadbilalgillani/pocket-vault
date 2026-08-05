import { requireUser } from "@/lib/auth/require-user"
import { ensureDefaultVaultCategories } from "@/server/repositories/vault-categories"
import { VaultItemForm } from "@/components/vault/vault-item-form"

export default async function NewVaultItemPage() {
  const user = await requireUser()
  const categories = await ensureDefaultVaultCategories(user.id)

  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">Add credential</h1>
      <VaultItemForm categories={categories} />
    </div>
  )
}
