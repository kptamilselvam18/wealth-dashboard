import { annuityFutureValue, monthlyRate, round } from "./core"
import { requiredMonthlyInvestment } from "./returns"

export type RetirementResult = {
  yearsToRetirement: number
  retirementYears: number
  monthlyExpenseAtRetirement: number
  annualExpenseAtRetirement: number
  corpusRequired: number
  realReturn: number
}

/**
 * Corpus needed at retirement to fund expenses for the remaining lifetime.
 * Uses inflation-adjusted (real) returns over the retirement period.
 */
export function retirementCorpus({
  monthlyExpense,
  currentAge,
  retirementAge,
  inflationPercent,
  postRetirementReturn,
  lifeExpectancy,
}: {
  monthlyExpense: number
  currentAge: number
  retirementAge: number
  inflationPercent: number
  postRetirementReturn: number
  lifeExpectancy: number
}): RetirementResult {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const retirementYears = Math.max(1, lifeExpectancy - retirementAge)
  const inflationFactor = (1 + inflationPercent / 100) ** yearsToRetirement
  const annualExpenseAtRetirement = monthlyExpense * 12 * inflationFactor
  const realReturn =
    (1 + postRetirementReturn / 100) / (1 + inflationPercent / 100) - 1

  let corpus: number
  if (Math.abs(realReturn) < 1e-9) {
    corpus = annualExpenseAtRetirement * retirementYears
  } else {
    corpus =
      annualExpenseAtRetirement *
      ((1 - (1 + realReturn) ** -retirementYears) / realReturn)
  }

  return {
    yearsToRetirement,
    retirementYears,
    monthlyExpenseAtRetirement: round(monthlyExpense * inflationFactor),
    annualExpenseAtRetirement: round(annualExpenseAtRetirement),
    corpusRequired: round(corpus),
    realReturn: round(realReturn * 100, 1),
  }
}

/** Monthly SIP needed to reach the retirement corpus, accounting for current savings. */
export function retirementSip({
  corpus,
  currentSavings,
  annualReturn,
  years,
}: {
  corpus: number
  currentSavings: number
  annualReturn: number
  years: number
}): number {
  return requiredMonthlyInvestment({
    target: corpus,
    current: currentSavings,
    annualRate: annualReturn,
    years,
  })
}

export type FireResult = {
  fireNumber: number
  progressPercent: number
  yearsToFire: number | null
  requiredMonthly: number
}

/** FIRE corpus using the safe withdrawal rate, plus a rough time-to-FIRE estimate. */
export function fireNumber({
  annualExpenses,
  withdrawalRate = 4,
  currentNetWorth = 0,
  monthlyInvestment = 0,
  expectedReturn = 10,
}: {
  annualExpenses: number
  withdrawalRate?: number
  currentNetWorth?: number
  monthlyInvestment?: number
  expectedReturn?: number
}): FireResult {
  const target = annualExpenses / (withdrawalRate / 100)
  const progress = target > 0 ? Math.min((currentNetWorth / target) * 100, 100) : 0

  let yearsToFire: number | null = null
  if (currentNetWorth >= target) {
    yearsToFire = 0
  } else if (monthlyInvestment > 0) {
    const rate = monthlyRate(expectedReturn)
    for (let month = 1; month <= 12 * 80; month += 1) {
      const projected =
        currentNetWorth * (1 + rate) ** month +
        annuityFutureValue(monthlyInvestment, rate, month)
      if (projected >= target) {
        yearsToFire = round(month / 12, 1)
        break
      }
    }
  }

  const requiredMonthly =
    yearsToFire && yearsToFire > 0
      ? requiredMonthlyInvestment({
          target,
          current: currentNetWorth,
          annualRate: expectedReturn,
          years: yearsToFire,
        })
      : 0

  return {
    fireNumber: round(target),
    progressPercent: round(progress),
    yearsToFire,
    requiredMonthly,
  }
}

/** Monthly SIP required for a goal, with optional step-up ignored for clarity. */
export function goalPlan({
  target,
  current,
  annualReturn,
  years,
}: {
  target: number
  current: number
  annualReturn: number
  years: number
}) {
  const monthly = requiredMonthlyInvestment({
    target,
    current,
    annualRate: annualReturn,
    years,
  })
  const existingGrowth = round(current * (1 + annualReturn / 100) ** years)
  return {
    monthlyRequired: monthly,
    totalContribution: round(monthly * years * 12),
    existingGrowth,
    shortfall: round(Math.max(target - existingGrowth, 0)),
  }
}

/** Future cost of education after inflation. */
export function educationCost({
  currentAnnualCost,
  years,
  inflationPercent,
}: {
  currentAnnualCost: number
  years: number
  inflationPercent: number
}) {
  const factor = (1 + inflationPercent / 100) ** years
  return {
    futureAnnualCost: round(currentAnnualCost * factor),
    futureFourYearCost: round(currentAnnualCost * factor * 4),
    inflationFactor: round(factor, 3),
  }
}

export function emergencyFund(monthlyExpenses: number, months: number) {
  return {
    target: round(monthlyExpenses * months),
    perMonth: round(monthlyExpenses),
  }
}

export function savingsRate(monthlyIncome: number, monthlyExpenses: number) {
  const savings = monthlyIncome - monthlyExpenses
  return {
    savings: round(savings),
    rate: monthlyIncome > 0 ? round((savings / monthlyIncome) * 100, 1) : 0,
    annualSavings: round(savings * 12),
  }
}

export type NetWorthBreakdown = {
  cash: number
  investments: number
  property: number
  otherAssets: number
  loans: number
  creditCards: number
  otherLiabilities: number
}

export function netWorthSummary(input: NetWorthBreakdown) {
  const assets =
    input.cash + input.investments + input.property + input.otherAssets
  const liabilities = input.loans + input.creditCards + input.otherLiabilities
  const netWorth = assets - liabilities

  return {
    assets: round(assets),
    liabilities: round(liabilities),
    netWorth: round(netWorth),
    debtToAssetRatio: assets > 0 ? round((liabilities / assets) * 100, 1) : 0,
    chart: [
      { label: "Cash", amount: round(input.cash) },
      { label: "Investments", amount: round(input.investments) },
      { label: "Property", amount: round(input.property) },
      { label: "Other assets", amount: round(input.otherAssets) },
      { label: "Loans", amount: -round(input.loans) },
      { label: "Credit cards", amount: -round(input.creditCards) },
      { label: "Other debt", amount: -round(input.otherLiabilities) },
    ],
  }
}

/** Simple budget split suggestion based on the 50/30/20 guideline. */
export function budgetSplit(monthlyIncome: number) {
  return {
    needs: round(monthlyIncome * 0.5),
    wants: round(monthlyIncome * 0.3),
    savings: round(monthlyIncome * 0.2),
  }
}
