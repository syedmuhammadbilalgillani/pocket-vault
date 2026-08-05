import { Suspense } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { BottomNav } from "@/components/layout/bottom-nav"
// Auth is intentionally NOT checked here anymore. This layout wraps every
// dashboard page, so an unwrapped requireUser() call here would force the
// *entire* layout (sidebar, header, nav — none of which need per-request
// data) to skip static prerendering under Cache Components. Each page's
// own Suspense-wrapped content component calls requireUser() itself
// (e.g. app/(dashboard)/vault/page.tsx's VaultContent) — that, plus
// proxy.ts's redirect, is the defense-in-depth per roadmap 7.3: the check
// still runs inside the handler that touches the data, just one level
// deeper than before.

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-4 md:pb-6">
          {children}
        </main>
      </SidebarInset>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </SidebarProvider>
  )
}
