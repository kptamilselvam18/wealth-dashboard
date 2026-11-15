"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  Calculator,
  HeartPulse,
  Star,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  PieChart,
  Settings,
  Sun,
  Target,
  X,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const groups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/portfolio", label: "My Portfolio", icon: PieChart },
      { href: "/transactions", label: "Transactions", icon: ListOrdered },
      { href: "/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/calculators", label: "Calculators", icon: Calculator },
      { href: "/goals", label: "Goals & Planning", icon: Target },
      { href: "/health", label: "Financial Health", icon: HeartPulse },
      { href: "/watchlists", label: "Watchlists & Alerts", icon: Star },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/profile", label: "Settings", icon: Settings }],
  },
]

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-800 text-sm font-bold text-primary-foreground shadow-sm">
        W
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">Wealth</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Dashboard
        </span>
      </span>
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform group-hover:scale-105",
                      isActive ? "text-primary" : undefined
                    )}
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function AccountFooter() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const name = session?.user?.name || session?.user?.email || "Investor"
  const initials = name.slice(0, 1).toUpperCase()

  return (
    <div className="border-t border-border/80 p-3">
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="mb-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {isDark ? "Light mode" : "Dark mode"}
      </button>
      <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {session?.user?.name || "Investor"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{session?.user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function Navigation() {
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!session) return null

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/80 bg-card/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-border/70 px-5">
          <Brand />
        </div>
        <NavLinks />
        <AccountFooter />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-card/85 px-4 backdrop-blur-xl lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-xl p-2 hover:bg-accent"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border/70 px-5">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-2 hover:bg-accent"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <AccountFooter />
          </div>
        </div>
      )}
    </>
  )
}
