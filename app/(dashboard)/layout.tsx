import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { requireUser } from "@/lib/auth/require-user"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Defense in depth: middleware.ts already redirects unauthenticated
  // requests, but authorization must also run inside the handler itself
  // per roadmap 7.3 — never rely on middleware alone.
  await requireUser()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-4 md:pb-6">
          {children}
        </main>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  )
}
