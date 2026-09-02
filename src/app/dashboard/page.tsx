"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/statcards/stat-card"
import { AssetAllocationCard } from "@/components/statcards/assets-allocation"
import { PerformanceChart } from "@/components/charts/performance-chart"
import { RecentActivity } from "@/components/activity"
import { AddInvestmentButton } from "@/components/add-investment"
import { AddTransactionButton } from "@/components/add-transaction"
import { ViewDetailsModal } from "@/components/modals/view-details-modal"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showDetails, setShowDetails] = useState(false)

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {session?.user?.name || "User"}</p>
          </div>
          <div className="flex gap-2">
            <AddInvestmentButton />
            <AddTransactionButton />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Net Worth</CardTitle>
              <span className="text-2xl">💰</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹0</div>
              <p className="text-xs opacity-80 mt-1">Total assets minus liabilities</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 text-primary-foreground border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Investments</CardTitle>
              <span className="text-2xl">📈</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹0</div>
              <p className="text-xs opacity-80 mt-1">Stocks, MFs, FDs, Gold</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-primary-foreground border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Cash</CardTitle>
              <span className="text-2xl">💵</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹0</div>
              <p className="text-xs opacity-80 mt-1">Savings and liquid assets</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-600 to-red-700 text-primary-foreground border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Liabilities</CardTitle>
              <span className="text-2xl">⚖️</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹0</div>
              <p className="text-xs opacity-80 mt-1">Loans and debts</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <PerformanceChart />
          <AssetAllocationCard />
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <RecentActivity />
            </CardContent>
          </Card>
        </div>

        <ViewDetailsModal open={showDetails} onClose={() => setShowDetails(false)} />
      </div>
    </div>
  )
}