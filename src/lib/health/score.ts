import type {
  FinancialAgeResult,
  HealthFactor,
  HealthInputs,
  HealthMilestone,
  HealthResult,
} from "./types"

const EMERGENCY_TARGET_MONTHS = 6
const SAVINGS_TARGET_PERCENT = 20
const DEBT_TARGET_RATIO = 0.3
const DIVERSIFICATION_TARGET_CLASSES = 4

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

function monthly(value: number): string {
  return `${value.toFixed(1)} months`
}

function gradeFor(score: number): { grade: string; tone: HealthResult["gradeTone"] } {
  if (score >= 85) return { grade: "Excellent", tone: "strong" }
  if (score >= 70) return { grade: "Good", tone: "good" }
  if (score >= 55) return { grade: "Fair", tone: "fair" }
  return { grade: "Needs attention", tone: "attention" }
}

function emergencyFactor(inputs: HealthInputs): HealthFactor {
  const base = {
    id: "emergencyFund" as const,
    label: "Emergency fund",
    weight: 20,
    target: `${EMERGENCY_TARGET_MONTHS} months of expenses in accessible savings`,
    evidence: "Cash-type holdings ÷ your monthly expenses",
    tip: "Keep three to six months of essential expenses in a liquid account before adding risk.",
  }

  if (inputs.monthlyExpenses === null || inputs.monthlyExpenses <= 0) {
    return {
      ...base,
      score: null,
      value: "Unknown",
      status: "unknown",
      evidence: "No monthly expense figure yet — add one in your Financial Health profile",
    }
  }

  const months = inputs.cash / inputs.monthlyExpenses
  return {
    ...base,
    score: clamp((months / EMERGENCY_TARGET_MONTHS) * 100),
    value: monthly(months),
    status: "measured",
  }
}

function savingsFactor(inputs: HealthInputs): HealthFactor {
  const base = {
    id: "savingsRate" as const,
    label: "Savings rate",
    weight: 20,
    target: `${SAVINGS_TARGET_PERCENT}% or more of monthly income kept`,
    evidence: "(monthly income − monthly expenses) ÷ monthly income",
    tip: "Automate a transfer on payday so saving happens before spending.",
  }

  if (
    inputs.monthlyIncome === null ||
    inputs.monthlyIncome <= 0 ||
    inputs.monthlyExpenses === null
  ) {
    return {
      ...base,
      score: null,
      value: "Unknown",
      status: "unknown",
      evidence: "Needs both monthly income and monthly expenses",
    }
  }

  const rate = ((inputs.monthlyIncome - inputs.monthlyExpenses) / inputs.monthlyIncome) * 100
  return {
    ...base,
    score: clamp((rate / SAVINGS_TARGET_PERCENT) * 100),
    value: percent(rate),
    status: "measured",
  }
}

function debtFactor(inputs: HealthInputs): HealthFactor {
  const base = {
    id: "debt" as const,
    label: "Debt burden",
    weight: 20,
    target: "Total debt below 30% of annual income",
    evidence: "Total outstanding liabilities ÷ annual income",
    tip: "Prioritise high-interest debt and keep total EMIs below a third of take-home pay.",
  }

  if (inputs.totalLiabilities <= 0) {
    if (inputs.totalAssets <= 0 && inputs.monthlyIncome === null) {
      return {
        ...base,
        score: null,
        value: "Unknown",
        status: "unknown",
        evidence: "No assets, debt or income recorded yet",
      }
    }

    return {
      ...base,
      score: 100,
      value: "No recorded debt",
      status: "measured",
      evidence: "No liabilities recorded in your accounts",
    }
  }

  if (inputs.monthlyIncome !== null && inputs.monthlyIncome > 0) {
    const ratio = inputs.totalLiabilities / (inputs.monthlyIncome * 12)
    return {
      ...base,
      score: clamp(100 - (ratio / 0.5) * 100),
      value: `${percent(ratio * 100)} of annual income`,
      status: "measured",
      evidence: inputs.monthlyEmi
        ? `Includes monthly EMIs of ₹${Math.round(inputs.monthlyEmi).toLocaleString("en-IN")}`
        : "Based on the liabilities recorded in your accounts",
    }
  }

  if (inputs.totalAssets > 0) {
    const ratio = inputs.totalLiabilities / inputs.totalAssets
    return {
      ...base,
      score: clamp(100 - (ratio / 0.5) * 100),
      value: `${percent(ratio * 100)} of assets`,
      status: "measured",
      evidence: "Monthly income not provided, so debt is scored against your assets",
    }
  }

  return {
    ...base,
    score: null,
    value: "Unknown",
    status: "unknown",
    evidence: "Add monthly income or assets to score this factor",
  }
}

function diversificationFactor(inputs: HealthInputs): HealthFactor {
  const base = {
    id: "diversification" as const,
    label: "Diversification",
    weight: 15,
    target: `${DIVERSIFICATION_TARGET_CLASSES}+ asset classes with no dominant position`,
    evidence: "Spread across asset classes and concentration of the largest position",
    tip: "Spreading across equity, debt, cash and gold reduces single-market shocks.",
  }

  const classes = inputs.assetClasses.filter((entry) => entry.value > 0)
  if (inputs.totalAssets <= 0 || classes.length === 0) {
    return {
      ...base,
      score: null,
      value: "Unknown",
      status: "unknown",
      evidence: "No assets recorded yet",
    }
  }

  const breadth = Math.min(100, classes.length * 25)
  const hhi = classes.reduce((sum, entry) => {
    const weight = entry.value / inputs.totalAssets
    return sum + weight * weight
  }, 0)
  const concentration = clamp(100 - hhi * 100, 0, 100)
  const score = clamp(0.6 * breadth + 0.4 * concentration)

  return {
    ...base,
    score,
    value: `${classes.length} asset classes`,
    status: "measured",
    evidence: `${inputs.holdingsCount} holdings · largest class ${percent(
      (Math.max(...classes.map((entry) => entry.value)) / inputs.totalAssets) * 100,
      0
    )}`,
  }
}

function goalsFactor(inputs: HealthInputs): HealthFactor {
  const base = {
    id: "goals" as const,
    label: "Goal progress",
    weight: 15,
    target: "Active goals funded to at least half of their target",
    evidence: "Average funded percentage of your active goals",
    tip: "Break large goals into monthly targets and review them quarterly.",
  }

  const active = inputs.goals.filter(
    (goal) => goal.status !== "ABANDONED" && goal.target > 0
  )
  if (active.length === 0) {
    return {
      ...base,
      score: null,
      value: "No goals",
      status: "unknown",
      evidence: "Create a goal to make this factor measurable",
    }
  }

  const progress = active.reduce(
    (sum, goal) => sum + Math.min(100, (goal.current / goal.target) * 100),
    0
  ) / active.length

  return {
    ...base,
    score: clamp(progress),
    value: percent(progress, 0),
    status: "measured",
    evidence: `${active.length} active goal${active.length === 1 ? "" : "s"} tracked`,
  }
}

function consistencyFactor(inputs: HealthInputs): HealthFactor {
  const base = {
    id: "consistency" as const,
    label: "Investing consistency",
    weight: 10,
    target: "A contribution in every month of the last six",
    evidence: "Months with a recorded buy, SIP or deposit over the last six months",
    tip: "Small, regular contributions usually matter more than timing the market.",
  }

  if (!inputs.hasTransactionHistory) {
    return {
      ...base,
      score: null,
      value: "Unknown",
      status: "unknown",
      evidence: "No transaction history recorded yet",
    }
  }

  return {
    ...base,
    score: clamp((inputs.contributionMonths / inputs.monthsConsidered) * 100),
    value: `${inputs.contributionMonths} of ${inputs.monthsConsidered} months`,
    status: "measured",
  }
}

function computeFinancialAge(
  inputs: HealthInputs,
  score: number,
  measuredCount: number
): FinancialAgeResult {
  const baseAge = 45
  const milestones: HealthMilestone[] = []

  const emergencyMonths =
    inputs.monthlyExpenses && inputs.monthlyExpenses > 0
      ? inputs.cash / inputs.monthlyExpenses
      : null
  milestones.push({
    label: "Three months of emergency expenses",
    credit: 4,
    status:
      emergencyMonths === null ? "unknown" : emergencyMonths >= 3 ? "met" : "not-met",
    detail:
      emergencyMonths === null
        ? "Add monthly expenses to measure this"
        : `${emergencyMonths.toFixed(1)} months covered`,
  })

  const savingsRate =
    inputs.monthlyIncome && inputs.monthlyIncome > 0 && inputs.monthlyExpenses !== null
      ? ((inputs.monthlyIncome - inputs.monthlyExpenses) / inputs.monthlyIncome) * 100
      : null
  milestones.push({
    label: "Saving at least 20% of income",
    credit: 5,
    status: savingsRate === null ? "unknown" : savingsRate >= 20 ? "met" : "not-met",
    detail: savingsRate === null ? "Add income and expenses" : percent(savingsRate),
  })

  const debtRatio =
    inputs.totalLiabilities <= 0
      ? 0
      : inputs.monthlyIncome && inputs.monthlyIncome > 0
        ? inputs.totalLiabilities / (inputs.monthlyIncome * 12)
        : inputs.totalAssets > 0
          ? inputs.totalLiabilities / inputs.totalAssets
          : null
  milestones.push({
    label: "Debt below 30% of annual income",
    credit: 4,
    status: debtRatio === null ? "unknown" : debtRatio <= DEBT_TARGET_RATIO ? "met" : "not-met",
    detail:
      debtRatio === null
        ? "Add income or assets to measure this"
        : `${percent(debtRatio * 100)} debt burden`,
  })

  const classCount = inputs.assetClasses.filter((entry) => entry.value > 0).length
  milestones.push({
    label: "Money spread across three asset classes",
    credit: 3,
    status: classCount >= 3 ? "met" : "not-met",
    detail: `${classCount} asset class${classCount === 1 ? "" : "es"}`,
  })

  const activeGoals = inputs.goals.filter((goal) => goal.target > 0)
  const bestGoal = activeGoals.reduce(
    (best, goal) => Math.max(best, Math.min(100, (goal.current / goal.target) * 100)),
    0
  )
  milestones.push({
    label: "At least one goal half funded",
    credit: 2,
    status: activeGoals.length === 0 ? "unknown" : bestGoal >= 50 ? "met" : "not-met",
    detail:
      activeGoals.length === 0
        ? "No goals recorded"
        : `Best funded goal at ${bestGoal.toFixed(0)}%`,
  })

  const consistency =
    inputs.hasTransactionHistory && inputs.monthsConsidered > 0
      ? (inputs.contributionMonths / inputs.monthsConsidered) * 100
      : null
  milestones.push({
    label: "Invested in five of the last six months",
    credit: 3,
    status: consistency === null ? "unknown" : consistency >= 80 ? "met" : "not-met",
    detail:
      consistency === null
        ? "No transaction history recorded"
        : `${percent(consistency, 0)} of months`,
  })

  const netWorthTarget =
    inputs.monthlyExpenses && inputs.monthlyExpenses > 0 ? inputs.monthlyExpenses * 6 : null
  milestones.push({
    label: "Net worth above six months of expenses",
    credit: 3,
    status:
      netWorthTarget === null
        ? "unknown"
        : inputs.netWorth >= netWorthTarget
          ? "met"
          : "not-met",
    detail:
      netWorthTarget === null
        ? "Add monthly expenses"
        : `₹${Math.round(Math.max(0, inputs.netWorth)).toLocaleString("en-IN")} vs ₹${Math.round(
            netWorthTarget
          ).toLocaleString("en-IN")}`,
  })

  const credits = milestones
    .filter((milestone) => milestone.status === "met")
    .reduce((sum, milestone) => sum + milestone.credit, 0)
  const penalty = Math.max(0, 40 - score) * 0.25
  const age = Math.round(Math.min(65, Math.max(21, baseAge - credits + penalty)))
  const available = measuredCount >= 3

  return {
    available,
    age: available ? age : null,
    actualAge: inputs.age,
    difference: available && inputs.age !== null ? age - inputs.age : null,
    baseAge,
    credits,
    penalty,
    milestones,
    note: "An educational estimate from the milestones below, not a medical or scientific measure.",
  }
}

export function computeFinancialHealth(inputs: HealthInputs): HealthResult {
  const factors: HealthFactor[] = [
    emergencyFactor(inputs),
    savingsFactor(inputs),
    debtFactor(inputs),
    diversificationFactor(inputs),
    goalsFactor(inputs),
    consistencyFactor(inputs),
  ]

  const measured = factors.filter((factor) => factor.score !== null)
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0)
  const measuredWeight = measured.reduce((sum, factor) => sum + factor.weight, 0)

  const score =
    measuredWeight > 0
      ? Math.round(
          measured.reduce((sum, factor) => sum + (factor.score as number) * factor.weight, 0) /
            measuredWeight
        )
      : 0
  const coverage = totalWeight > 0 ? measuredWeight / totalWeight : 0
  const { grade, tone } = gradeFor(score)

  const strengths = measured
    .filter((factor) => (factor.score as number) >= 75)
    .map((factor) => factor.label)

  const focusAreas = measured
    .filter((factor) => (factor.score as number) < 60)
    .map((factor) => factor.label)

  const unknownGuidance: Record<string, string> = {
    emergencyFund: "Add monthly expenses, and record your savings account as a cash asset.",
    savingsRate: "Add your monthly income and monthly expenses in the profile above.",
    debt: "Add your loans and credit card balances under liabilities.",
    diversification: "Add your holdings so exposure can be measured.",
    goals: "Create a financial goal with a target amount and date.",
    consistency: "Record buy, SIP or deposit transactions to measure consistency.",
  }

  const unknownFactors = factors
    .filter((factor) => factor.status === "unknown")
    .map((factor) => ({
      label: factor.label,
      howTo: unknownGuidance[factor.id] ?? "Add the missing data to measure this factor.",
    }))

  return {
    score,
    grade,
    gradeTone: tone,
    coverage,
    factors,
    strengths,
    focusAreas,
    unknownFactors,
    financialAge: computeFinancialAge(inputs, score, measured.length),
    computedAt: new Date().toISOString(),
  }
}
