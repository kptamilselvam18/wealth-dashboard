import "./globals.css"
import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import { AppShell } from "@/components/app-shell"

export const metadata: Metadata = {
  title: "Wealth Dashboard",
  description: "Track investments, run financial calculations and understand your portfolio",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
