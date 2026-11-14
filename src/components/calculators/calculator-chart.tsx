"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { CalculatorChart as ChartSpec } from "@/lib/calculators/types"
import { formatCompactCurrency, formatCurrency } from "@/lib/format"

const PALETTE = ["#0f766e", "#2563eb", "#f59e0b", "#ef4444"]

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--card-foreground)",
  fontSize: 12,
}

export function CalculatorChart({ chart }: { chart: ChartSpec }) {
  if (!chart.data.length) return null

  const axisProps = {
    tick: { fontSize: 11, fill: "var(--muted-foreground)" },
    tickLine: false,
    axisLine: false,
  }

  const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

  const xAxis = <XAxis dataKey={chart.xKey} {...axisProps} minTickGap={20} />
  const yAxis = (
    <YAxis
      tickFormatter={(value) => formatCompactCurrency(Number(value))}
      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
      tickLine={false}
      axisLine={false}
      width={72}
    />
  )
  const tooltip = (
    <Tooltip
      formatter={(value) => formatCurrency(Number(value))}
      labelFormatter={(label) => `${chart.xLabel}: ${label}`}
      contentStyle={tooltipStyle}
    />
  )
  const legend = <Legend wrapperStyle={{ fontSize: 12 }} />

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chart.type === "bar" ? (
          <BarChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {chart.series.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                fill={series.color ?? PALETTE[index % PALETTE.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : chart.type === "line" ? (
          <LineChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {chart.series.map((series, index) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color ?? PALETTE[index % PALETTE.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {chart.series.map((series, index) => (
                <linearGradient
                  key={series.key}
                  id={`gradient-${series.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={series.color ?? PALETTE[index % PALETTE.length]}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor={series.color ?? PALETTE[index % PALETTE.length]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {chart.series.map((series, index) => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color ?? PALETTE[index % PALETTE.length]}
                strokeWidth={2}
                fill={`url(#gradient-${series.key})`}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
