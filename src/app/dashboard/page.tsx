"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Calculator,
  CreditCard,
  HeartPulse,
  Landmark,
  Target,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageError, PageLoading } from "@/components/page-state"
import { useSummary } from "@/components/summary-provider"
import { PerformanceChart } from "@/components/charts/performance-chart"
import { AssetAllocationCard } from "@/components/statcards/assets-allocation"
import { RecentActivity } from "@/components/activity"
import { AddInvestmentButton } from "@/components/add-investment"
import { AddTransactionButton } from "@/components/add-transaction"
import { RefreshPricesButton } from "@/components/refresh-prices"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const QUICK_LINKS = [
  { href: "/calculators", label: "Calculators", icon: Calculator },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/health", label: "Financial Health", icon: HeartPulse },
  { href: "/liabilities", label: "Manage debts", icon: CreditCard },
]

function MetricCard({
  label,
  value,
  hint,
  icon,
  featured = false,
  tone = "default",
}: {
  label: string
  value: string
  hint: string
  icon: React.ReactNode
  featured?: boolean
  tone?: "default" | "positive" | "negative"
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        featured
          ? "border-transparent bg-gradient-to-br from-primary via-primary to-emerald-800 text-primary-foreground surface-lift"
          : "border-border/80 bg-card surface-shadow"
      )}
    >
      {featured && (
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-sm font-medium",
            featured ? "text-primary-foreground/85" : "text-muted-foreground"
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            featured
              ? "bg-white/15 text-primary-foreground"
              : tone === "positive"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                : tone === "negative"
                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
                  : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </span>
      </div>
      <p className="relative mt-3 text-[26px] font-semibold leading-tight tracking-tight tabular-nums">
        {value}
      </p>
      <p
        className={cn(
          "relative mt-1 text-xs",
          featured ? "text-primary-foreground/75" : "text-muted-foreground"
        )}
      >
        {hint}
      </p>
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

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="mx-auto max-w-7xl animate-rise px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {today}
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Investor"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here is how your money is doing today.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <RefreshPricesButton />
          <AddInvestmentButton />
          <AddTransactionButton />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground surface-shadow"
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Net worth"
          value={formatCurrency(summary.netWorth)}
          hint={`Assets ${formatCurrency(summary.totalAssets)}`}
          icon={<Wallet className="h-4.5 w-4.5" />}
          featured
        />
        <MetricCard
          label="Investments"
          value={formatCurrency(summary.totalCurrentValue)}
          hint={`Invested ${formatCurrency(summary.totalInvested)} · ${formatPercent(summary.overallReturn)}`}
          icon={<TrendingUp className="h-4.5 w-4.5" />}
          tone="positive"
        />
        <MetricCard
          label="Cash available"
          value={formatCurrency(summary.totalCash)}
          hint="Savings and liquid balances"
          icon={<Landmark className="h-4.5 w-4.5" />}
        />
        <MetricCard
          label="Liabilities"
          value={formatCurrency(summary.totalLiabilities)}
          hint="Loans and outstanding debt"
          icon={<CreditCard className="h-4.5 w-4.5" />}
          tone="negative"
        />
      </div>

      {!summary.holdings.length && <section className="mt-6 overflow-hidden rounded-2xl border bg-card p-6 sm:p-8"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Build your financial picture</h2><p className="mt-2 text-sm text-muted-foreground">Start with what you own, then decide where you want to go.</p></div><span className="rounded-full bg-primary/10 p-3 text-primary"><CheckCircle2 className="h-6 w-6" /></span></div><div className="grid gap-3 sm:grid-cols-3">{[["01", "Add an investment", "Bring your holdings together", "/portfolio"], ["02", "Set your first goal", "Give your money a direction", "/goals"], ["03", "Check financial health", "Understand your next priorities", "/health"]].map(([step, title, text, href]) => <Link key={step} href={href} className="group rounded-xl border bg-background/60 p-4 transition-colors hover:border-primary/40"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold text-primary">{step}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{text}</p></Link>)}</div></section>}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <PerformanceChart performance={summary.performance} />
        <AssetAllocationCard allocation={summary.allocation} />
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")}>
              View all
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
