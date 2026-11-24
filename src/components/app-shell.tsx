"use client"

import { useSession } from "next-auth/react"
import { Navigation } from "@/components/navigation"
import { WorkspaceHeader } from "@/components/workspace-header"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const authenticated = status === "authenticated"

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className={authenticated ? "lg:pl-64" : undefined}>
        {authenticated && <WorkspaceHeader />}
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  )
}
