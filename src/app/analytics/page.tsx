"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageError, PageLoading } from "@/components/page-state"
import { useSummary } from "@/components/summary-provider"
import { StatCard } from "@/components/statcards/stat-card"
import { AssetAllocationCard } from "@/components/statcards/assets-allocation"
import { PerformanceChart } from "@/components/charts/performance-chart"
import { MonthlyInvestmentsChart } from "@/components/charts/monthly-investments"
import { formatCurrency, formatPercent } from "@/lib/format"

export default function AnalyticsPage() {
  const { summary, loading, error } = useSummary()
  const [timeRange, setTimeRange] = useState("ALL")

  if (loading) return <PageLoading label="Crunching your numbers..." />
  if (error || !summary) {
    return <PageError message={error ?? "No analytics available"} />
  }

  const best = summary.topPerformers[0]
  const worst = summary.underPerformers[0]
  const investmentCount = summary.holdings.filter((holding) => holding.type !== "Cash").length

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Portfolio performance and insights</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Return"
          value={formatPercent(summary.overallReturn)}
          change={summary.overallReturn}
          changeLabel="since purchase"
        />
        <StatCard
          title="Unrealised P&L"
          value={formatCurrency(summary.totalPnl)}
        />
        <StatCard title="Best Asset" value={best?.name ?? "—"} />
        <StatCard title="Holdings" value={String(investmentCount)} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerformanceChart
          performance={summary.performance}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        <AssetAllocationCard allocation={summary.allocation} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.topPerformers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Add holdings to see your best performers.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.topPerformers.map((performer) => (
                  <div
                    key={`${performer.name}-${performer.symbol}`}
                    className="flex items-center justify-between border-b py-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-medium">{performer.name}</span>
                    </div>
                    <span className="font-medium text-emerald-600">
                      {formatPercent(performer.returnPercent)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Underperformers</CardTitle>
          </CardHeader>
          <CardContent>
            {!worst ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No loss-making holdings right now.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.underPerformers.map((performer) => (
                  <div
                    key={`${performer.name}-${performer.symbol}`}
                    className="flex items-center justify-between border-b py-2 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="font-medium">{performer.name}</span>
                    </div>
                    <span className="font-medium text-red-600">
                      {formatPercent(performer.returnPercent)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MonthlyInvestmentsChart data={summary.monthlyInvestments} />
    </div>
  )
}
