import "./globals.css"
import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import { Navigation } from "@/components/navigation"

export const metadata: Metadata = {
  title: "Wealth Dashboard",
  description: "Track your investments and financial portfolio in one place",
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
          <Navigation />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
