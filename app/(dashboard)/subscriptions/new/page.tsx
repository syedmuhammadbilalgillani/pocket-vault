import { Suspense } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { ensureDefaultExpenseCategories } from "@/server/repositories/expense-categories";
import { RecurringRuleForm } from "@/components/subscriptions/recurring-rule-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewRecurringRulePage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-4 font-heading text-xl font-semibold">
        Add recurring transaction
      </h1>
      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <NewRecurringRuleContent />
      </Suspense>
    </div>
  );
}

async function NewRecurringRuleContent() {
  const user = await requireUser();
  const categories = await ensureDefaultExpenseCategories(user.id);
  return <RecurringRuleForm categories={categories} />;
}
