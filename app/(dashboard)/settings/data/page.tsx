import { format } from "date-fns"

import { requireUser } from "@/lib/auth/require-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PasswordConfirmExportButton } from "@/components/exports/password-confirm-export-button"
import { DeleteAccountForm } from "@/components/settings/delete-account-form"

export default async function DataSettingsPage() {
  await requireUser()

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <h1 className="font-heading text-xl font-semibold">Data</h1>

      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
          <CardDescription>Download a copy of your expenses or an encrypted vault backup.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <PasswordConfirmExportButton
            exportType="transactions"
            label="Export expenses (this month)"
            description="Exports contain your financial data — confirm it's you before downloading."
            baseUrl={`/api/exports/transactions?month=${format(new Date(), "yyyy-MM")}`}
          />
          <PasswordConfirmExportButton
            exportType="vault"
            label="Export vault backup"
            description="This downloads an encrypted backup — passwords stay encrypted in the file. Confirm it's you before downloading."
            baseUrl="/api/exports/vault"
          />
        </CardContent>
      </Card>

      <DeleteAccountForm />
    </div>
  )
}
