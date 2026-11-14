import { round } from "./core"

export type Purchase = { quantity: number; price: number }

/** Weighted average buy price across multiple purchases. */
export function averageBuyPrice(purchases: Purchase[]): number | null {
  const totalQuantity = purchases.reduce((sum, item) => sum + item.quantity, 0)
  if (totalQuantity <= 0) return null
  const totalCost = purchases.reduce((sum, item) => sum + item.quantity * item.price, 0)
  return round(totalCost / totalQuantity, 4)
}

export function positionSummary({
  quantity,
  averagePrice,
  currentPrice,
}: {
  quantity: number
  averagePrice: number
  currentPrice: number
}) {
  const invested = quantity * averagePrice
  const currentValue = quantity * currentPrice
  const pnl = currentValue - invested
  return {
    invested: round(invested),
    currentValue: round(currentValue),
    pnl: round(pnl),
    returnPercent: invested > 0 ? round((pnl / invested) * 100) : 0,
  }
}

/** Annual dividend income and yield for an equity position. */
export function dividendSummary({
  shares,
  dividendPerShare,
  pricePerShare,
}: {
  shares: number
  dividendPerShare: number
  pricePerShare: number
}) {
  const annualIncome = shares * dividendPerShare
  return {
    annualIncome: round(annualIncome),
    monthlyIncome: round(annualIncome / 12),
    yieldPercent: pricePerShare > 0 ? round((dividendPerShare / pricePerShare) * 100, 2) : 0,
    costOnInvestment: round(shares * pricePerShare),
  }
}

/** Value and weights of a simple allocation list. */
export function allocationWeights(entries: { label: string; value: number }[]) {
  const total = entries.reduce((sum, entry) => sum + Math.max(entry.value, 0), 0)
  return entries
    .map((entry) => ({
      label: entry.label,
      value: round(Math.max(entry.value, 0)),
      weight: total > 0 ? round((Math.max(entry.value, 0) / total) * 100, 1) : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

/** Expected return and volatility style metrics from yearly returns. */
export function riskReturn(yearlyReturns: number[]) {
  if (yearlyReturns.length === 0) {
    return { averageReturn: 0, volatility: 0, best: 0, worst: 0, sharpe: 0 }
  }
  const average = yearlyReturns.reduce((sum, value) => sum + value, 0) / yearlyReturns.length
  const variance =
    yearlyReturns.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    yearlyReturns.length
  const volatility = Math.sqrt(variance)
  const riskFree = 6.5

  return {
    averageReturn: round(average),
    volatility: round(volatility),
    best: round(Math.max(...yearlyReturns)),
    worst: round(Math.min(...yearlyReturns)),
    sharpe: volatility > 0 ? round((average - riskFree) / volatility) : 0,
  }
}
