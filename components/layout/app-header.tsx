"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm">
      <SidebarTrigger className="hidden md:flex" />
      <span className="font-heading text-sm font-semibold md:hidden">Pocket Vault</span>
    </header>
  )
}
