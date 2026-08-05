import { Suspense } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { ensureDefaultVaultCategories } from "@/server/repositories/vault-categories";
import { VaultItemForm } from "@/components/vault/vault-item-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewVaultItemPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">
        Add credential
      </h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <NewVaultItemContent />
      </Suspense>
    </div>
  );
}

async function NewVaultItemContent() {
  const user = await requireUser();
  const categories = await ensureDefaultVaultCategories(user.id);
  return <VaultItemForm categories={categories} />;
}
