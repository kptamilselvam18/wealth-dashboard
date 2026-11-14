"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectItem } from "@/components/ui/select"
import type { PerformancePoint } from "@/lib/summary-types"
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format"

const RANGE_DAYS: Record<string, number | null> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: null,
}

export function PerformanceChart({
  performance,
  timeRange = "ALL",
  onTimeRangeChange,
}: {
  performance: PerformancePoint[]
  timeRange?: string
  onTimeRangeChange?: (value: string) => void
}) {
  const days = RANGE_DAYS[timeRange] ?? null
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null
  const filtered = cutoff
    ? performance.filter((point) => new Date(point.date).getTime() >= cutoff)
    : performance

  const data = filtered.map((point) => ({
    label: new Date(point.date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    }),
    value: Math.round(point.value),
    invested: Math.round(point.invested),
  }))

  const first = data[0]
  const last = data[data.length - 1]
  const change =
    first && last && first.value > 0 ? ((last.value - first.value) / first.value) * 100 : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold">Portfolio Performance</CardTitle>
        {onTimeRangeChange && (
          <Select
            value={timeRange}
            onValueChange={onTimeRangeChange}
            className="h-9 w-[110px]"
            aria-label="Performance time range"
          >
            {Object.keys(RANGE_DAYS).map((range) => (
              <SelectItem key={range} value={range}>
                {range}
              </SelectItem>
            ))}
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {data.length < 2 ? (
          <div className="flex h-[260px] items-center justify-center rounded-lg bg-muted/50">
            <p className="px-6 text-center text-sm text-muted-foreground">
              Performance history builds up as your portfolio changes. Add or update an
              investment to start the chart.
            </p>
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(value) => formatCompactCurrency(Number(value))}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    name === "value" ? "Portfolio value" : "Invested",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#valueGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted-foreground">
            Current: {formatCurrency(last?.value ?? 0)}
          </span>
          <span className={change >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
            {formatPercent(change)} over period
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
