"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { PerformanceChart } from "@/components/charts/performance-chart"
import { AssetAllocationCard } from "@/components/statcards/assets-allocation"
import { StatCard } from "@/components/statcards/stat-card"

export default function AnalyticsPage() {
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

  const [timeRange, setTimeRange] = useState("1M")

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Portfolio performance and insights</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Return" value="+12.5%" change={12.5} changeLabel="vs last year" />
          <StatCard title="Best Asset" value="HDFC Equity" />
          <StatCard title="Worst Asset" value="Gold ETF" />
          <StatCard title="Sharpe Ratio" value="1.2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PerformanceChart timeRange={timeRange} onTimeRangeChange={setTimeRange} />
          <AssetAllocationCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">HDFC Equity Fund</span>
                  </div>
                  <span className="text-green-600 font-medium">+18.5%</span>
                </div>
                <div className="flex justify-between items-center p-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">Reliance Industries</span>
                  </div>
                  <span className="text-green-600 font-medium">+15.2%</span>
                </div>
                <div className="flex justify-between items-center p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="font-medium">ICICI Bank</span>
                  </div>
                  <span className="text-green-600 font-medium">+12.8%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Underperformers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="font-medium">Gold ETF</span>
                  </div>
                  <span className="text-red-600 font-medium">-3.2%</span>
                </div>
                <div className="flex justify-between items-center p-2 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="font-medium">Silver Fund</span>
                  </div>
                  <span className="text-red-600 font-medium">-2.1%</span>
                </div>
                <div className="flex justify-between items-center p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="font-medium">Fixed Deposit</span>
                  </div>
                  <span className="text-red-600 font-medium">+0.5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Investment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Monthly trend chart will be displayed here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}