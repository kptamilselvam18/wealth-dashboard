import "./globals.css"
import { Providers } from "@/components/providers"
import { Navigation } from "@/components/navigation"

export const metadata = {
  title: "Wealth Dashboard",
  description: "Track your investments and financial portfolio in one place",
  icons: {
    favicon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-background">
            <Navigation />
            <main className="container mx-auto px-4 py-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}