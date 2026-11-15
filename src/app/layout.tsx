import "./globals.css"
import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import { Providers } from "@/components/providers"
import { AppShell } from "@/components/app-shell"

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
})

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
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
