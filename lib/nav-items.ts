import {
  LayoutDashboard,
  KeyRound,
  Wallet,
  PiggyBank,
  Repeat,
  BarChart3,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

// Shown in the mobile bottom nav and pinned at the top of the desktop sidebar.
export const primaryNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Vault", href: "/vault", icon: KeyRound },
  { title: "Expenses", href: "/expenses", icon: Wallet },
  { title: "Budgets", href: "/budgets", icon: PiggyBank },
]

// Reachable from the mobile "More" sheet and the rest of the desktop sidebar.
export const secondaryNavItems: NavItem[] = [
  { title: "Subscriptions", href: "/subscriptions", icon: Repeat },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Settings", href: "/settings/profile", icon: Settings },
]

export const allNavItems: NavItem[] = [...primaryNavItems, ...secondaryNavItems]
