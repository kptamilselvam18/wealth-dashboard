"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CreditCard, Landmark, TrendingUp, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageError, PageLoading } from "@/components/page-state"
import { useSummary } from "@/components/summary-provider"
import { PerformanceChart } from "@/components/charts/performance-chart"
import { AssetAllocationCard } from "@/components/statcards/assets-allocation"
import { RecentActivity } from "@/components/activity"
import { AddInvestmentButton } from "@/components/add-investment"
import { AddTransactionButton } from "@/components/add-transaction"
import { formatCurrency, formatPercent } from "@/lib/format"

function MetricCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
  className: string
}) {
  return (
    <div className={`rounded-lg p-6 text-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-90">{label}</p>
        <span className="opacity-80">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs opacity-80">{hint}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { summary, loading, error } = useSummary()
  const router = useRouter()

  if (loading) return <PageLoading />
  if (error || !summary) {
    return <PageError message={error ?? "No portfolio data available"} />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || "Investor"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddInvestmentButton />
          <AddTransactionButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Net Worth"
          value={formatCurrency(summary.netWorth)}
          hint={`Total assets ${formatCurrency(summary.totalAssets)}`}
          icon={<Wallet className="h-5 w-5" />}
          className="bg-gradient-to-br from-primary to-primary/70"
        />
        <MetricCard
          label="Total Investments"
          value={formatCurrency(summary.totalCurrentValue)}
          hint={`Invested ${formatCurrency(summary.totalInvested)} · ${formatPercent(summary.overallReturn)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          className="bg-gradient-to-br from-emerald-600 to-emerald-700"
        />
        <MetricCard
          label="Total Cash"
          value={formatCurrency(summary.totalCash)}
          hint="Savings and liquid balances"
          icon={<Landmark className="h-5 w-5" />}
          className="bg-gradient-to-br from-blue-600 to-blue-700"
        />
        <MetricCard
          label="Total Liabilities"
          value={formatCurrency(summary.totalLiabilities)}
          hint="Loans and debts"
          icon={<CreditCard className="h-5 w-5" />}
          className="bg-gradient-to-br from-red-600 to-red-700"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerformanceChart performance={summary.performance} />
        <AssetAllocationCard allocation={summary.allocation} />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <RecentActivity transactions={summary.recentTransactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
