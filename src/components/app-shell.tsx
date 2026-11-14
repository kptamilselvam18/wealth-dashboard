"use client"

import { useSession } from "next-auth/react"
import { Navigation } from "@/components/navigation"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const authenticated = status === "authenticated"

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className={authenticated ? "lg:pl-64" : undefined}>{children}</main>
    </div>
  )
}
