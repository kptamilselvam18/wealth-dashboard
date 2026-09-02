"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/statcards/stat-card"
import { AddInvestmentButton } from "@/components/add-investment"
import { AddTransactionButton } from "@/components/add-transaction"
import { PortfolioTable } from "@/components/portfolio-table"
import { AssetAllocationCard } from "@/components/statcards/assets-allocation"
import { PerformanceChart } from "@/components/charts/performance-chart"

export default function PortfolioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            <h1 className="text-2xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground">All your investments in one place</p>
          </div>
          <div className="flex gap-2">
            <AddInvestmentButton />
            <AddTransactionButton />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Invested" value="₹0" />
          <StatCard title="Current Value" value="₹0" />
          <StatCard title="Total Returns" value="₹0" />
          <StatCard title="Return %" value="0%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PerformanceChart />
          <AssetAllocationCard />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioTable />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}