"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { primaryNavItems, secondaryNavItems } from "@/lib/nav-items"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm",
        "pb-[env(safe-area-inset-bottom)] md:hidden",
      )}
    >
      <ul className="grid grid-cols-5">
        {primaryNavItems.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                {item.title}
              </Link>
            </li>
          )
        })}
        <li>
          <Sheet>
            <SheetTrigger
              className={cn(
                "flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                secondaryNavItems.some((item) => isActive(pathname, item.href))
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <SheetHeader>
                <SheetTitle>More</SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-4 gap-2 px-4 pb-2">
                {secondaryNavItems.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg py-3 text-xs font-medium transition-colors",
                          active
                            ? "bg-accent text-primary"
                            : "text-muted-foreground hover:bg-accent",
                        )}
                      >
                        <item.icon className="size-5" aria-hidden="true" />
                        {item.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  )
}
