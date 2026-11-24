"use client"

import { useState } from "react"
import { ExportButton } from "@/components/export-button"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
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
  const [query, setQuery] = useState("")
  const [assetType, setAssetType] = useState("ALL")
  const [sort, setSort] = useState("value")

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
          <ExportButton type="holdings" />
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
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Input aria-label="Search holdings" placeholder="Search name or symbol..." value={query} onChange={e => setQuery(e.target.value)} />
            <Select aria-label="Filter asset type" value={assetType} onValueChange={setAssetType}><SelectItem value="ALL">All asset types</SelectItem>{Array.from(new Set(summary.holdings.map(h => h.type))).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</Select>
            <Select aria-label="Sort holdings" value={sort} onValueChange={setSort}><SelectItem value="value">Highest value</SelectItem><SelectItem value="return">Highest return</SelectItem><SelectItem value="name">Name A–Z</SelectItem></Select>
          </div>
          <PortfolioTable holdings={summary.holdings.filter(h => (assetType === "ALL" || h.type === assetType) && `${h.name} ${h.symbol ?? ""}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "return" ? b.returnPercent - a.returnPercent : b.currentValue - a.currentValue)} />
        </CardContent>
      </Card>
    </div>
  )
}
