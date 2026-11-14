"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { SummaryProvider } from "@/components/summary-provider"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SummaryProvider>{children}</SummaryProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
