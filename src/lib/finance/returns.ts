import { annuityFutureValue, monthlyRate, round } from "./core"

export type GrowthPoint = {
  year: number
  invested: number
  value: number
}

export type ProjectionResult = {
  invested: number
  futureValue: number
  gain: number
  series: GrowthPoint[]
}

/**
 * SIP projection with optional annual step-up and an optional starting lump sum.
 * Contributions are assumed to be made at the end of each month.
 */
export function sipProjection({
  monthly,
  annualRate,
  years,
  stepUpPercent = 0,
  initial = 0,
}: {
  monthly: number
  annualRate: number
  years: number
  stepUpPercent?: number
  initial?: number
}): ProjectionResult {
  const months = Math.max(0, Math.round(years * 12))
  const rate = monthlyRate(annualRate)
  let contribution = monthly
  let balance = initial
  let invested = initial
  const series: GrowthPoint[] = []

  for (let month = 1; month <= months; month += 1) {
    // Step-up applies at the start of each new year after the first.
    if (stepUpPercent > 0 && month > 1 && (month - 1) % 12 === 0) {
      contribution *= 1 + stepUpPercent / 100
    }
    balance = balance * (1 + rate) + contribution
    invested += contribution

    if (month % 12 === 0) {
      series.push({
        year: month / 12,
        invested: round(invested),
        value: round(balance),
      })
    }
  }

  return {
    invested: round(invested),
    futureValue: round(balance),
    gain: round(balance - invested),
    series,
  }
}

/** Lumpsum growth compounded annually. */
export function lumpsumProjection(
  principal: number,
  annualRate: number,
  years: number
): ProjectionResult {
  const safeYears = Math.max(0, years)
  const series: GrowthPoint[] = []
  const rate = annualRate / 100

  for (let year = 1; year <= Math.floor(safeYears); year += 1) {
    series.push({
      year,
      invested: round(principal),
      value: round(principal * (1 + rate) ** year),
    })
  }

  const futureValue = principal * (1 + rate) ** safeYears

  return {
    invested: round(principal),
    futureValue: round(futureValue),
    gain: round(futureValue - principal),
    series,
  }
}

/** Compound interest with a configurable compounding frequency. */
export function compoundProjection({
  principal,
  annualRate,
  years,
  compoundsPerYear,
  monthlyContribution = 0,
}: {
  principal: number
  annualRate: number
  years: number
  compoundsPerYear: number
  monthlyContribution?: number
}): ProjectionResult {
  const rate = annualRate / 100
  const n = compoundsPerYear
  const series: GrowthPoint[] = []
  let invested = principal
  let balance = principal

  for (let month = 1; month <= years * 12; month += 1) {
    balance *= (1 + rate / n) ** (n / 12)
    balance += monthlyContribution
    invested += monthlyContribution

    if (month % 12 === 0) {
      series.push({ year: month / 12, invested: round(invested), value: round(balance) })
    }
  }

  return {
    invested: round(invested),
    futureValue: round(balance),
    gain: round(balance - invested),
    series,
  }
}

export type SwpResult = {
  monthsLasted: number
  depleted: boolean
  totalWithdrawn: number
  finalBalance: number
  series: { year: number; balance: number; withdrawn: number }[]
}

/** Systematic withdrawal plan: fixed monthly withdrawal from a corpus. */
export function swpProjection({
  corpus,
  monthlyWithdrawal,
  annualRate,
  years,
}: {
  corpus: number
  monthlyWithdrawal: number
  annualRate: number
  years: number
}): SwpResult {
  const rate = monthlyRate(annualRate)
  const maxMonths = Math.max(0, Math.round(years * 12))
  let balance = corpus
  let withdrawn = 0
  let monthsLasted = 0
  const series: { year: number; balance: number; withdrawn: number }[] = []

  for (let month = 1; month <= maxMonths; month += 1) {
    balance = balance * (1 + rate)
    const amount = Math.min(monthlyWithdrawal, balance)
    balance -= amount
    withdrawn += amount
    monthsLasted = month

    if (month % 12 === 0) {
      series.push({ year: month / 12, balance: round(balance), withdrawn: round(withdrawn) })
    }

    if (balance <= 0.5) break
  }

  return {
    monthsLasted,
    depleted: balance <= 0.5,
    totalWithdrawn: round(withdrawn),
    finalBalance: round(Math.max(balance, 0)),
    series,
  }
}

/** Compound annual growth rate as a percentage. Returns null when undefined. */
export function cagr(beginValue: number, endValue: number, years: number): number | null {
  if (beginValue <= 0 || endValue <= 0 || years <= 0) return null
  return round(((endValue / beginValue) ** (1 / years) - 1) * 100)
}

/** Cost of a good after inflation, and what today's money will be worth. */
export function inflationImpact(amount: number, inflationPercent: number, years: number) {
  const factor = (1 + inflationPercent / 100) ** years
  return {
    futureCost: round(amount * factor),
    futureValueOfToday: round(amount / factor),
    purchasingPowerLoss: round(amount - amount / factor),
    multiplier: round(factor, 3),
  }
}

/** Compare investing a total amount as a lumpsum versus spreading it as monthly SIPs. */
export function sipVsLumpsum({
  total,
  annualRate,
  years,
}: {
  total: number
  annualRate: number
  years: number
}) {
  const months = Math.max(1, Math.round(years * 12))
  const monthly = total / months
  const sip = sipProjection({ monthly, annualRate, years })
  const lump = lumpsumProjection(total, annualRate, years)

  return {
    sip,
    lumpsum: lump,
    difference: round(lump.futureValue - sip.futureValue),
    series: sip.series.map((point, index) => ({
      year: point.year,
      sip: point.value,
      lumpsum: lump.series[index]?.value ?? round(total * (1 + annualRate / 100) ** point.year),
    })),
  }
}

/**
 * XIRR for irregular cash flows using Newton–Raphson with a bisection fallback.
 * Negative values are outflows (investments), positive are inflows (redemptions).
 */
export function xirr(
  cashFlows: { amount: number; date: Date }[]
): number | null {
  if (cashFlows.length < 2) return null
  if (!cashFlows.some((flow) => flow.amount > 0) || !cashFlows.some((flow) => flow.amount < 0)) {
    return null
  }

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const start = sorted[0].date.getTime()
  const years = sorted.map((flow) => (flow.date.getTime() - start) / (365 * 24 * 60 * 60 * 1000))

  const npv = (rate: number) =>
    sorted.reduce((sum, flow, index) => sum + flow.amount / (1 + rate) ** years[index], 0)

  let low = -0.9999
  let high = 10
  let lowValue = npv(low)
  let highValue = npv(high)

  if (Number.isNaN(lowValue) || Number.isNaN(highValue)) return null
  if (lowValue * highValue > 0) return null

  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2
    const value = npv(mid)
    if (Math.abs(value) < 1e-7 || high - low < 1e-9) {
      return round(mid * 100)
    }
    if (value * lowValue < 0) {
      high = mid
      highValue = value
    } else {
      low = mid
      lowValue = value
    }
  }

  return round(((low + high) / 2) * 100)
}

/** Value of a future sum in today's money. */
export function presentValue(futureValue: number, discountPercent: number, years: number): number {
  if (years <= 0) return round(futureValue)
  return round(futureValue / (1 + discountPercent / 100) ** years)
}

/** Monthly investment required to reach a target, given existing savings. */
export function requiredMonthlyInvestment({
  target,
  current,
  annualRate,
  years,
}: {
  target: number
  current: number
  annualRate: number
  years: number
}): number {
  const months = Math.max(0, Math.round(years * 12))
  const rate = monthlyRate(annualRate)
  if (months === 0) return 0
  const grown = current * (1 + rate) ** months
  const remaining = target - grown
  if (remaining <= 0) return 0
  const factor = annuityFutureValue(1, rate, months)
  return round(remaining / factor)
}
