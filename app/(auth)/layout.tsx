import { ShieldCheck } from "lucide-react"

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
        <span className="font-heading text-lg font-semibold">Pocket Vault</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
