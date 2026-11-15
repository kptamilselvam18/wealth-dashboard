import { describe, expect, it } from "vitest"
import { computeFinancialHealth } from "./score"
import type { HealthInputs } from "./types"

function inputs(overrides: Partial<HealthInputs> = {}): HealthInputs {
  return {
    cash: 0,
    investments: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    monthlyEmi: 0,
    monthlyIncome: null,
    monthlyExpenses: null,
    assetClasses: [],
    holdingsCount: 0,
    goals: [],
    contributionMonths: 0,
    monthsConsidered: 0,
    hasTransactionHistory: false,
    netWorth: 0,
    age: null,
    ...overrides,
  }
}

const healthy = inputs({
  cash: 600000,
  investments: 3000000,
  totalAssets: 3600000,
  totalLiabilities: 500000,
  monthlyEmi: 12000,
  monthlyIncome: 150000,
  monthlyExpenses: 60000,
  assetClasses: [
    { name: "Stocks", value: 1800000 },
    { name: "Mutual Funds", value: 900000 },
    { name: "Cash", value: 600000 },
    { name: "Gold", value: 300000 },
  ],
  holdingsCount: 12,
  goals: [{ name: "House", target: 2000000, current: 1400000, status: "IN_PROGRESS" }],
  contributionMonths: 6,
  monthsConsidered: 6,
  hasTransactionHistory: true,
  netWorth: 3100000,
  age: 32,
})

const fragile = inputs({
  cash: 20000,
  investments: 50000,
  totalAssets: 70000,
  totalLiabilities: 400000,
  monthlyEmi: 18000,
  monthlyIncome: 60000,
  monthlyExpenses: 58000,
  assetClasses: [{ name: "Stocks", value: 70000 }],
  holdingsCount: 1,
  goals: [],
  contributionMonths: 1,
  monthsConsidered: 6,
  hasTransactionHistory: true,
  netWorth: -330000,
})

describe("financial health scoring", () => {
  it("reports no score when nothing is measurable", () => {
    const result = computeFinancialHealth(inputs())
    expect(result.coverage).toBe(0)
    expect(result.factors.every((factor) => factor.status === "unknown")).toBe(true)
    expect(result.unknownFactors.length).toBe(6)
    expect(result.financialAge.available).toBe(false)
    expect(result.financialAge.age).toBeNull()
  })

  it("marks a factor unknown rather than poor when expenses are missing", () => {
    const result = computeFinancialHealth(inputs({ cash: 500000 }))
    const emergency = result.factors.find((factor) => factor.id === "emergencyFund")
    expect(emergency?.status).toBe("unknown")
    expect(emergency?.score).toBeNull()
  })

  it("scores a strong profile higher than a fragile one", () => {
    const strong = computeFinancialHealth(healthy)
    const weak = computeFinancialHealth(fragile)
    expect(strong.score).toBeGreaterThan(weak.score)
    expect(strong.score).toBeGreaterThanOrEqual(70)
    expect(weak.score).toBeLessThan(50)
    expect(strong.grade).toBe("Good")
  })

  it("renormalises over known factors and reports coverage", () => {
    const withoutIncome = computeFinancialHealth({
      ...healthy,
      monthlyIncome: null,
      monthlyExpenses: null,
    })
    expect(withoutIncome.coverage).toBeLessThan(1)
    const knownWeight = withoutIncome.factors
      .filter((factor) => factor.status === "measured")
      .reduce((sum, factor) => sum + factor.weight, 0)
    expect(withoutIncome.coverage).toBeCloseTo(knownWeight / 100, 5)
    expect(withoutIncome.unknownFactors.map((factor) => factor.label)).toContain(
      "Savings rate"
    )
  })

  it("falls back to debt-to-assets when income is unknown", () => {
    const result = computeFinancialHealth({
      ...healthy,
      monthlyIncome: null,
      monthlyExpenses: null,
    })
    const debt = result.factors.find((factor) => factor.id === "debt")
    expect(debt?.status).toBe("measured")
    expect(debt?.evidence).toContain("assets")
    expect(debt?.score).toBeGreaterThan(0)
  })

  it("scores an emergency fund of six months at 100 and zero at 0", () => {
    const covered = computeFinancialHealth(healthy).factors.find(
      (factor) => factor.id === "emergencyFund"
    )
    expect(covered?.score).toBe(100)
    expect(covered?.value).toBe("10.0 months")

    const none = computeFinancialHealth({ ...healthy, cash: 0 }).factors.find(
      (factor) => factor.id === "emergencyFund"
    )
    expect(none?.score).toBe(0)
  })

  it("computes savings rate and handles spending above income", () => {
    const result = computeFinancialHealth({
      ...healthy,
      monthlyIncome: 50000,
      monthlyExpenses: 60000,
    })
    const savings = result.factors.find((factor) => factor.id === "savingsRate")
    expect(savings?.value).toBe("-20.0%")
    expect(savings?.score).toBe(0)
  })

  it("rewards broader, less concentrated portfolios", () => {
    const broad = computeFinancialHealth(healthy).factors.find(
      (factor) => factor.id === "diversification"
    )
    const narrow = computeFinancialHealth({
      ...healthy,
      assetClasses: [{ name: "Stocks", value: 3600000 }],
      holdingsCount: 1,
    }).factors.find((factor) => factor.id === "diversification")
    expect(broad?.score).toBeGreaterThan(narrow?.score as number)
    expect(narrow?.score).toBeLessThan(30)
  })

  it("leaves goals and consistency unknown without records", () => {
    const result = computeFinancialHealth({
      ...healthy,
      goals: [],
      hasTransactionHistory: false,
      contributionMonths: 0,
      monthsConsidered: 0,
    })
    const goals = result.factors.find((factor) => factor.id === "goals")
    const consistency = result.factors.find((factor) => factor.id === "consistency")
    expect(goals?.status).toBe("unknown")
    expect(consistency?.status).toBe("unknown")
  })

  it("lists strengths and focus areas from measured factors", () => {
    const result = computeFinancialHealth(healthy)
    expect(result.strengths).toContain("Emergency fund")
    expect(result.strengths).toContain("Savings rate")
    expect(result.focusAreas).toContain("Debt burden")
  })
})

describe("financial age", () => {
  it("is available once three factors are measurable", () => {
    const twoOnly = computeFinancialHealth(inputs({ cash: 100000, monthlyExpenses: 20000 }))
    // emergency fund + debt (no recorded debt) => 2 measured
    expect(twoOnly.financialAge.available).toBe(false)

    const result = computeFinancialHealth(healthy)
    expect(result.financialAge.available).toBe(true)
    expect(result.financialAge.age).toBeGreaterThanOrEqual(21)
    expect(result.financialAge.age).toBeLessThanOrEqual(65)
  })

  it("gives a younger financial age to a stronger profile", () => {
    const strong = computeFinancialHealth(healthy).financialAge.age as number
    const weak = computeFinancialHealth(fragile).financialAge.age as number
    expect(strong).toBeLessThan(weak)
  })

  it("compares with actual age only when provided", () => {
    const withAge = computeFinancialHealth(healthy).financialAge
    expect(withAge.actualAge).toBe(32)
    expect(withAge.difference).toBe((withAge.age as number) - 32)
    expect(withAge.milestones.find((m) => m.label.includes("emergency"))?.status).toBe("met")

    const withoutAge = computeFinancialHealth({ ...healthy, age: null }).financialAge
    expect(withoutAge.actualAge).toBeNull()
    expect(withoutAge.difference).toBeNull()
  })

  it("marks unmeasurable milestones as unknown, not failed", () => {
    const result = computeFinancialHealth(inputs({ cash: 100000, investments: 400000, totalAssets: 500000 }))
    const savings = result.financialAge.milestones.find((m) => m.label.includes("20%"))
    expect(savings?.status).toBe("unknown")
  })

  it("credits are deterministic and bounded", () => {
    const age = computeFinancialHealth(healthy).financialAge
    const earned = age.milestones
      .filter((milestone) => milestone.status === "met")
      .reduce((sum, milestone) => sum + milestone.credit, 0)
    expect(age.credits).toBe(earned)
    expect(age.baseAge).toBe(45)
    expect(age.note).toContain("educational estimate")
  })
})
