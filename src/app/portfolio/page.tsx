"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageError, PageLoading } from "@/components/page-state"
import { useSummary } from "@/components/summary-provider"
import { StatCard } from "@/components/statcards/stat-card"
import { AssetAllocationCard } from "@/components/statcards/assets-allocation"
import { PerformanceChart } from "@/components/charts/performance-chart"
import { PortfolioTable } from "@/components/portfolio-table"
import { AddInvestmentButton } from "@/components/add-investment"
import { AddTransactionButton } from "@/components/add-transaction"
import { RefreshPricesButton } from "@/components/refresh-prices"
import { formatCurrency, formatPercent } from "@/lib/format"

export default function PortfolioPage() {
  const { summary, loading, error } = useSummary()
  const [timeRange, setTimeRange] = useState("ALL")

  if (loading) return <PageLoading />
  if (error || !summary) {
    return <PageError message={error ?? "No portfolio data available"} />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">All your investments in one place</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.pricesAsOf
              ? `Prices last recorded ${new Date(summary.pricesAsOf).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}. Provider quotes can be delayed.`
              : "No market prices recorded yet — add a symbol and refresh prices."}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <RefreshPricesButton />
          <AddInvestmentButton />
          <AddTransactionButton />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Invested" value={formatCurrency(summary.totalInvested)} />
        <StatCard title="Current Value" value={formatCurrency(summary.totalCurrentValue)} />
        <StatCard
          title="Total Returns"
          value={formatCurrency(summary.totalPnl)}
          change={summary.overallReturn}
        />
        <StatCard title="Return %" value={formatPercent(summary.overallReturn)} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerformanceChart
          performance={summary.performance}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        <AssetAllocationCard allocation={summary.allocation} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioTable holdings={summary.holdings} />
        </CardContent>
      </Card>
    </div>
  )
}
