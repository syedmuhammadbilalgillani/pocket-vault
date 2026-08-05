import Link from "next/link"
import { ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <ShieldCheck className="size-12 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">Pocket Vault</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          A secure personal dashboard for managing saved account credentials and tracking
          monthly expenses.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </main>
  )
}
