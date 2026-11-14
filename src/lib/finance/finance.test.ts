import { describe, expect, it } from "vitest"
import {
  averageBuyPrice,
  cagr,
  emergencyFund,
  equityCapitalGains,
  expenseRatioImpact,
  inflationImpact,
  loanSchedule,
  lumpsumProjection,
  netWorthSummary,
  prepaymentImpact,
  retirementCorpus,
  savingsRate,
  sipProjection,
  swpProjection,
  xirr,
} from "./index"

describe("sipProjection", () => {
  it("matches the annuity formula for a 12% return", () => {
    const result = sipProjection({ monthly: 1000, annualRate: 12, years: 1 })
    expect(result.invested).toBe(12000)
    expect(result.futureValue).toBeCloseTo(12682.5, 0)
  })

  it("returns contributions unchanged when the return is zero", () => {
    const result = sipProjection({ monthly: 5000, annualRate: 0, years: 3 })
    expect(result.futureValue).toBe(180000)
    expect(result.gain).toBe(0)
  })

  it("grows contributions with a yearly step-up", () => {
    const flat = sipProjection({ monthly: 1000, annualRate: 10, years: 5 })
    const stepped = sipProjection({
      monthly: 1000,
      annualRate: 10,
      years: 5,
      stepUpPercent: 10,
    })
    expect(stepped.invested).toBeGreaterThan(flat.invested)
    expect(stepped.futureValue).toBeGreaterThan(flat.futureValue)
  })

  it("produces one chart point per completed year", () => {
    const result = sipProjection({ monthly: 1000, annualRate: 10, years: 4 })
    expect(result.series).toHaveLength(4)
    expect(result.series[3].year).toBe(4)
  })
})

describe("lumpsumProjection", () => {
  it("compounds annually", () => {
    const result = lumpsumProjection(100000, 10, 2)
    expect(result.futureValue).toBeCloseTo(121000, 0)
    expect(result.gain).toBeCloseTo(21000, 0)
  })

  it("handles a zero-year horizon", () => {
    const result = lumpsumProjection(100000, 10, 0)
    expect(result.futureValue).toBe(100000)
    expect(result.series).toHaveLength(0)
  })
})

describe("cagr", () => {
  it("computes yearly growth", () => {
    expect(cagr(100000, 121000, 2)).toBeCloseTo(10, 5)
  })

  it("returns null for invalid inputs", () => {
    expect(cagr(0, 100, 5)).toBeNull()
    expect(cagr(100, 200, 0)).toBeNull()
  })
})

describe("xirr", () => {
  it("recovers a simple one-year 10% return", () => {
    const rate = xirr([
      { amount: -1000, date: new Date("2020-01-01") },
      { amount: 1100, date: new Date("2021-01-01") },
    ])
    expect(rate).not.toBeNull()
    expect(rate as number).toBeGreaterThan(9)
    expect(rate as number).toBeLessThan(11)
  })

  it("returns null without both inflows and outflows", () => {
    expect(xirr([{ amount: 100, date: new Date() }])).toBeNull()
  })
})

describe("swpProjection", () => {
  it("depletes a corpus with no growth", () => {
    const result = swpProjection({
      corpus: 120000,
      monthlyWithdrawal: 10000,
      annualRate: 0,
      years: 5,
    })
    expect(result.depleted).toBe(true)
    expect(result.monthsLasted).toBe(12)
    expect(result.totalWithdrawn).toBe(120000)
  })

  it("leaves a balance when withdrawals are small", () => {
    const result = swpProjection({
      corpus: 5000000,
      monthlyWithdrawal: 10000,
      annualRate: 8,
      years: 10,
    })
    expect(result.depleted).toBe(false)
    expect(result.finalBalance).toBeGreaterThan(0)
  })
})

describe("loans", () => {
  it("computes an EMI close to the reference value", () => {
    const schedule = loanSchedule(100000, 12, 1)
    expect(schedule.monthlyEmi).toBeCloseTo(8884.88, 1)
    expect(schedule.totalInterest).toBeGreaterThan(0)
  })

  it("saves interest when paying extra each month", () => {
    const result = prepaymentImpact({
      principal: 2500000,
      annualRate: 8.5,
      years: 20,
      extraMonthly: 10000,
    })
    expect(result.interestSaved).toBeGreaterThan(0)
    expect(result.monthsSaved).toBeGreaterThan(0)
  })

  it("saves nothing when the extra payment is zero", () => {
    const result = prepaymentImpact({
      principal: 2500000,
      annualRate: 8.5,
      years: 20,
      extraMonthly: 0,
    })
    expect(result.interestSaved).toBeCloseTo(0, 0)
  })
})

describe("planning", () => {
  it("uses the 4% rule for FIRE", () => {
    const summary = netWorthSummary({
      cash: 100000,
      investments: 200000,
      property: 0,
      otherAssets: 0,
      loans: 50000,
      creditCards: 0,
      otherLiabilities: 0,
    })
    expect(summary.netWorth).toBe(250000)
    expect(summary.assets).toBe(300000)
    expect(summary.liabilities).toBe(50000)
  })

  it("computes savings rate and handles spending above income", () => {
    expect(savingsRate(100000, 70000).rate).toBe(30)
    expect(savingsRate(50000, 60000).rate).toBe(-20)
  })

  it("sizes an emergency fund", () => {
    expect(emergencyFund(50000, 6).target).toBe(300000)
  })

  it("requires a larger corpus when retirement is further away", () => {
    const early = retirementCorpus({
      monthlyExpense: 50000,
      currentAge: 30,
      retirementAge: 50,
      inflationPercent: 6,
      postRetirementReturn: 8,
      lifeExpectancy: 85,
    })
    const late = retirementCorpus({
      monthlyExpense: 50000,
      currentAge: 30,
      retirementAge: 60,
      inflationPercent: 6,
      postRetirementReturn: 8,
      lifeExpectancy: 85,
    })
    expect(late.corpusRequired).toBeGreaterThan(early.corpusRequired)
  })
})

describe("inflation", () => {
  it("inflates costs and discounts purchasing power", () => {
    const result = inflationImpact(100000, 10, 1)
    expect(result.futureCost).toBeCloseTo(110000, 0)
    expect(result.futureValueOfToday).toBeCloseTo(90909.09, 0)
  })
})

describe("portfolio and tax", () => {
  it("weights the average buy price by quantity", () => {
    expect(
      averageBuyPrice([
        { quantity: 10, price: 100 },
        { quantity: 30, price: 200 },
      ])
    ).toBe(175)
  })

  it("returns null with no purchases", () => {
    expect(averageBuyPrice([])).toBeNull()
  })

  it("applies LTCG exemption then 12.5%", () => {
    const result = equityCapitalGains({
      buyPrice: 100,
      sellPrice: 300,
      quantity: 1000,
      holdingMonths: 18,
    })
    expect(result.type).toBe("LTCG")
    expect(result.gain).toBe(200000)
    expect(result.exemptionUsed).toBe(125000)
    expect(result.tax).toBeCloseTo(9375, 2)
  })

  it("applies 20% STCG with no exemption", () => {
    const result = equityCapitalGains({
      buyPrice: 100,
      sellPrice: 200,
      quantity: 1000,
      holdingMonths: 6,
    })
    expect(result.type).toBe("STCG")
    expect(result.exemptionUsed).toBe(0)
    expect(result.tax).toBeCloseTo(20000, 2)
  })

  it("does not tax capital losses", () => {
    const result = equityCapitalGains({
      buyPrice: 200,
      sellPrice: 100,
      quantity: 10,
      holdingMonths: 24,
    })
    expect(result.gain).toBe(-1000)
    expect(result.tax).toBe(0)
  })

  it("charges a real cost for a higher expense ratio", () => {
    const result = expenseRatioImpact({
      principal: 1000000,
      grossReturn: 12,
      expenseRatio: 1.5,
      years: 20,
    })
    expect(result.cost).toBeGreaterThan(0)
    expect(result.withCost).toBeLessThan(result.withoutCost)
  })
})
