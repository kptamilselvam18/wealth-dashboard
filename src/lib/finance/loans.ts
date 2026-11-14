import { monthlyRate, round } from "./core"

export type AmortizationRow = {
  year: number
  principalPaid: number
  interestPaid: number
  balance: number
}

export type LoanResult = {
  monthlyEmi: number
  totalPayment: number
  totalInterest: number
  schedule: AmortizationRow[]
}

/** Equated monthly instalment. */
export function emi(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0
  const rate = monthlyRate(annualRate)
  const months = Math.round(years * 12)
  if (rate === 0) return round(principal / months)
  return round((principal * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1))
}

/** Full amortization schedule with yearly aggregation. */
export function loanSchedule(principal: number, annualRate: number, years: number): LoanResult {
  const months = Math.max(1, Math.round(years * 12))
  const rate = monthlyRate(annualRate)
  const payment = emi(principal, annualRate, years)

  let balance = principal
  let totalInterest = 0
  const schedule: AmortizationRow[] = []
  let yearInterest = 0
  let yearPrincipal = 0

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * rate
    const principalPaid = Math.min(payment - interest, balance)
    balance = Math.max(balance - principalPaid, 0)
    totalInterest += interest
    yearInterest += interest
    yearPrincipal += principalPaid

    if (month % 12 === 0 || month === months) {
      schedule.push({
        year: Math.ceil(month / 12),
        principalPaid: round(yearPrincipal),
        interestPaid: round(yearInterest),
        balance: round(balance),
      })
      yearInterest = 0
      yearPrincipal = 0
    }
  }

  return {
    monthlyEmi: payment,
    totalPayment: round(principal + totalInterest),
    totalInterest: round(totalInterest),
    schedule,
  }
}

export type PrepaymentResult = {
  baselineInterest: number
  newInterest: number
  interestSaved: number
  monthsSaved: number
  newTenureMonths: number
  monthlyOutgo: number
}

/**
 * Effect of paying an extra amount each month while keeping the same EMI.
 * The loan closes earlier; interest saved is measured against the original tenure.
 */
export function prepaymentImpact({
  principal,
  annualRate,
  years,
  extraMonthly,
}: {
  principal: number
  annualRate: number
  years: number
  extraMonthly: number
}): PrepaymentResult {
  const rate = monthlyRate(annualRate)
  const basePayment = emi(principal, annualRate, years)
  const base = loanSchedule(principal, annualRate, years)

  let balance = principal
  let interest = 0
  let months = 0
  const totalMonthly = basePayment + extraMonthly

  while (balance > 0.5 && months < years * 12) {
    const monthInterest = balance * rate
    const payment = Math.min(totalMonthly, balance + monthInterest)
    const principalPaid = payment - monthInterest
    balance -= principalPaid
    interest += monthInterest
    months += 1
  }

  return {
    baselineInterest: base.totalInterest,
    newInterest: round(interest),
    interestSaved: round(base.totalInterest - interest),
    monthsSaved: Math.max(0, Math.round(years * 12) - months),
    newTenureMonths: months,
    monthlyOutgo: round(totalMonthly),
  }
}

/** Cost of revolving a credit-card balance for a number of months. */
export function creditCardInterest({
  balance,
  annualRate,
  months,
  payment,
}: {
  balance: number
  annualRate: number
  months: number
  payment: number
}) {
  const rate = monthlyRate(annualRate)
  let outstanding = balance
  let interest = 0
  const series: { month: number; balance: number; interest: number }[] = []

  for (let month = 1; month <= months; month += 1) {
    const monthInterest = outstanding * rate
    interest += monthInterest
    outstanding = Math.max(outstanding + monthInterest - payment, 0)
    series.push({ month, balance: round(outstanding), interest: round(monthInterest) })
    if (outstanding <= 0) break
  }

  return {
    totalInterest: round(interest),
    finalBalance: round(outstanding),
    monthsToClear: series.length,
    series,
  }
}
