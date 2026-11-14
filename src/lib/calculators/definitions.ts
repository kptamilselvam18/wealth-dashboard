import {
  CalculationError,
  averageBuyPrice,
  cagr,
  compoundProjection,
  dividendSummary,
  educationCost,
  emergencyFund,
  equityCapitalGains,
  expenseRatioImpact,
  fireNumber,
  goalPlan,
  inflationImpact,
  loanSchedule,
  lumpsumProjection,
  netWorthSummary,
  prepaymentImpact,
  retirementCorpus,
  savingsRate,
  sipProjection,
  sipVsLumpsum,
  swpProjection,
} from "@/lib/finance"
import type { CalculatorDefinition } from "./types"

function growthChart(series: { year: number; invested: number; value: number }[]) {
  return {
    type: "area" as const,
    xKey: "year",
    xLabel: "Year",
    series: [
      { key: "invested", label: "Invested", color: "#94a3b8" },
      { key: "value", label: "Projected value", color: "#0f766e" },
    ],
    data: series.map((point) => ({
      year: point.year,
      invested: point.invested,
      value: point.value,
    })),
  }
}

function gainPercent(gain: number, invested: number): number {
  return invested > 0 ? Number(((gain / invested) * 100).toFixed(2)) : 0
}

const calculators: CalculatorDefinition[] = [
  {
    slug: "sip",
    name: "SIP Calculator",
    category: "Returns",
    tagline: "Project a monthly SIP",
    description:
      "Estimate how a fixed monthly systematic investment plan could grow over time at an assumed rate of return.",
    formula:
      "FV = P × [((1 + i)^n − 1) / i], where P is the monthly contribution, i the monthly rate and n the number of months.",
    assumptions: [
      "Returns are compounded monthly and assumed to be constant.",
      "Contributions are made at the end of each month.",
      "Actual mutual fund returns vary and are not guaranteed.",
    ],
    fields: [
      { key: "monthly", label: "Monthly investment", type: "currency", defaultValue: 10000, min: 0, step: 500 },
      { key: "annualRate", label: "Expected annual return", type: "percent", defaultValue: 12, min: 0, max: 30, step: 0.5 },
      { key: "years", label: "Investment period", type: "years", defaultValue: 10, min: 1, max: 50, step: 1 },
    ],
    compute: ({ monthly, annualRate, years }) => {
      const projection = sipProjection({ monthly, annualRate, years })
      return {
        results: [
          { label: "Total invested", value: projection.invested, format: "currency" },
          { label: "Estimated value", value: projection.futureValue, format: "currency", emphasis: true },
          { label: "Estimated gain", value: projection.gain, format: "currency" },
          { label: "Gain on invested", value: gainPercent(projection.gain, projection.invested), format: "percent" },
        ],
        chart: growthChart(projection.series),
      }
    },
  },
  {
    slug: "step-up-sip",
    name: "Step-up SIP Calculator",
    category: "Returns",
    tagline: "Increase your SIP every year",
    description:
      "Model a SIP whose monthly contribution rises by a fixed percentage each year, matching income growth.",
    formula:
      "Each year the monthly contribution grows by the step-up percentage, then compounds monthly at the expected return.",
    assumptions: [
      "Step-up is applied once every 12 months.",
      "The return rate stays constant across the whole period.",
    ],
    fields: [
      { key: "monthly", label: "Starting monthly investment", type: "currency", defaultValue: 10000, min: 0, step: 500 },
      { key: "stepUpPercent", label: "Annual step-up", type: "percent", defaultValue: 10, min: 0, max: 100, step: 1 },
      { key: "annualRate", label: "Expected annual return", type: "percent", defaultValue: 12, min: 0, max: 30, step: 0.5 },
      { key: "years", label: "Investment period", type: "years", defaultValue: 15, min: 1, max: 50, step: 1 },
    ],
    compute: ({ monthly, stepUpPercent, annualRate, years }) => {
      const projection = sipProjection({ monthly, annualRate, years, stepUpPercent })
      const flat = sipProjection({ monthly, annualRate, years })
      return {
        results: [
          { label: "Total invested", value: projection.invested, format: "currency" },
          { label: "Estimated value", value: projection.futureValue, format: "currency", emphasis: true },
          { label: "Extra vs flat SIP", value: projection.futureValue - flat.futureValue, format: "currency" },
          { label: "Estimated gain", value: projection.gain, format: "currency" },
        ],
        chart: growthChart(projection.series),
      }
    },
  },
  {
    slug: "lumpsum",
    name: "Lumpsum Calculator",
    category: "Returns",
    tagline: "One-time investment growth",
    description: "Project the future value of a single investment compounded annually.",
    formula: "FV = P × (1 + r)^t",
    assumptions: ["Compounded once a year at a constant rate.", "No taxes or exit loads are applied."],
    fields: [
      { key: "principal", label: "Investment amount", type: "currency", defaultValue: 500000, min: 0, step: 10000 },
      { key: "annualRate", label: "Expected annual return", type: "percent", defaultValue: 12, min: 0, max: 30, step: 0.5 },
      { key: "years", label: "Investment period", type: "years", defaultValue: 10, min: 1, max: 50, step: 1 },
    ],
    compute: ({ principal, annualRate, years }) => {
      const projection = lumpsumProjection(principal, annualRate, years)
      return {
        results: [
          { label: "Invested", value: projection.invested, format: "currency" },
          { label: "Estimated value", value: projection.futureValue, format: "currency", emphasis: true },
          { label: "Estimated gain", value: projection.gain, format: "currency" },
          { label: "Gain on invested", value: gainPercent(projection.gain, projection.invested), format: "percent" },
        ],
        chart: growthChart(projection.series),
      }
    },
  },
  {
    slug: "compound-interest",
    name: "Compound Interest Calculator",
    category: "Returns",
    tagline: "Compounding at any frequency",
    description:
      "Calculate compound interest on a principal with optional monthly contributions and a chosen compounding frequency.",
    formula: "A = P × (1 + r/n)^(n·t), plus monthly contributions",
    assumptions: [
      "Interest is reinvested and no money is withdrawn.",
      "Compounding frequency affects the effective annual yield.",
    ],
    fields: [
      { key: "principal", label: "Principal", type: "currency", defaultValue: 100000, min: 0, step: 5000 },
      { key: "annualRate", label: "Annual interest rate", type: "percent", defaultValue: 8, min: 0, max: 30, step: 0.25 },
      { key: "years", label: "Time period", type: "years", defaultValue: 10, min: 1, max: 50, step: 1 },
      { key: "compoundsPerYear", label: "Compounds per year", type: "number", defaultValue: 4, min: 1, max: 12, step: 1, help: "1 = annually, 4 = quarterly, 12 = monthly" },
      { key: "monthlyContribution", label: "Monthly contribution (optional)", type: "currency", defaultValue: 0, min: 0, step: 500 },
    ],
    compute: ({ principal, annualRate, years, compoundsPerYear, monthlyContribution }) => {
      const projection = compoundProjection({
        principal,
        annualRate,
        years,
        compoundsPerYear: Math.max(1, Math.round(compoundsPerYear)),
        monthlyContribution,
      })
      return {
        results: [
          { label: "Total invested", value: projection.invested, format: "currency" },
          { label: "Estimated value", value: projection.futureValue, format: "currency", emphasis: true },
          { label: "Interest earned", value: projection.gain, format: "currency" },
        ],
        chart: growthChart(projection.series),
      }
    },
  },
  {
    slug: "cagr",
    name: "CAGR Calculator",
    category: "Returns",
    tagline: "Annualised growth between two values",
    description:
      "Calculate the compound annual growth rate between an initial and a final value over a number of years.",
    formula: "CAGR = (End / Begin)^(1 / years) − 1",
    assumptions: ["Uses only the start and end values, ignoring the path in between."],
    fields: [
      { key: "begin", label: "Initial value", type: "currency", defaultValue: 100000, min: 1, step: 5000 },
      { key: "end", label: "Final value", type: "currency", defaultValue: 250000, min: 1, step: 5000 },
      { key: "years", label: "Holding period", type: "years", defaultValue: 5, min: 0.1, max: 60, step: 0.5 },
    ],
    compute: ({ begin, end, years }) => {
      const rate = cagr(begin, end, years)
      if (rate === null) throw new CalculationError("Enter positive values and a period greater than zero")
      return {
        results: [
          { label: "CAGR", value: rate, format: "percent", emphasis: true },
          { label: "Absolute return", value: Number((((end - begin) / begin) * 100).toFixed(2)), format: "percent" },
          { label: "Total gain", value: Number((end - begin).toFixed(2)), format: "currency" },
          { label: "Growth multiple", value: Number((end / begin).toFixed(2)), format: "number" },
        ],
      }
    },
  },
  {
    slug: "swp",
    name: "SWP Calculator",
    category: "Withdrawals",
    tagline: "Regular income from a corpus",
    description:
      "Check how long a corpus lasts when you withdraw a fixed amount every month while the balance keeps earning.",
    formula:
      "Each month the balance grows by the monthly return and is reduced by the withdrawal, until it reaches zero.",
    assumptions: [
      "Withdrawals happen monthly and returns are constant.",
      "Taxes and exit loads on withdrawals are not included.",
    ],
    fields: [
      { key: "corpus", label: "Starting corpus", type: "currency", defaultValue: 5000000, min: 0, step: 100000 },
      { key: "monthlyWithdrawal", label: "Monthly withdrawal", type: "currency", defaultValue: 30000, min: 0, step: 1000 },
      { key: "annualRate", label: "Expected annual return", type: "percent", defaultValue: 8, min: 0, max: 30, step: 0.5 },
      { key: "years", label: "Withdrawal period", type: "years", defaultValue: 20, min: 1, max: 50, step: 1 },
    ],
    compute: ({ corpus, monthlyWithdrawal, annualRate, years }) => {
      const result = swpProjection({ corpus, monthlyWithdrawal, annualRate, years })
      return {
        results: [
          { label: "Corpus lasts", value: result.monthsLasted, format: "months", emphasis: true },
          { label: "Total withdrawn", value: result.totalWithdrawn, format: "currency" },
          { label: "Balance at end", value: result.finalBalance, format: "currency" },
          {
            label: "Average monthly income",
            value: result.monthsLasted > 0 ? Number((result.totalWithdrawn / result.monthsLasted).toFixed(2)) : 0,
            format: "currency",
          },
        ],
        chart: {
          type: "line",
          xKey: "year",
          xLabel: "Year",
          series: [
            { key: "balance", label: "Corpus balance", color: "#0f766e" },
            { key: "withdrawn", label: "Cumulative withdrawn", color: "#f59e0b" },
          ],
          data: result.series.map((point) => ({
            year: point.year,
            balance: point.balance,
            withdrawn: point.withdrawn,
          })),
        },
        notes: result.depleted
          ? ["The corpus runs out before the selected period ends."]
          : [`The corpus is still worth about ₹${result.finalBalance.toLocaleString("en-IN")} at the end of the period.`],
      }
    },
  },
  {
    slug: "sip-vs-lumpsum",
    name: "SIP vs Lumpsum",
    category: "Returns",
    tagline: "Same money, two strategies",
    description:
      "Compare investing a total amount all at once against spreading it as equal monthly investments.",
    formula: "Lumpsum: P × (1 + r)^t. SIP: monthly annuity future value.",
    assumptions: [
      "Both routes use the same assumed annual return.",
      "SIP spreads the total equally across the period.",
    ],
    fields: [
      { key: "total", label: "Total amount", type: "currency", defaultValue: 1200000, min: 0, step: 50000 },
      { key: "annualRate", label: "Expected annual return", type: "percent", defaultValue: 12, min: 0, max: 30, step: 0.5 },
      { key: "years", label: "Investment period", type: "years", defaultValue: 10, min: 1, max: 40, step: 1 },
    ],
    compute: ({ total, annualRate, years }) => {
      const comparison = sipVsLumpsum({ total, annualRate, years })
      const winner = comparison.difference >= 0 ? "Lumpsum" : "SIP"
      return {
        results: [
          { label: "Lumpsum value", value: comparison.lumpsum.futureValue, format: "currency", emphasis: true },
          { label: "SIP value", value: comparison.sip.futureValue, format: "currency", emphasis: true },
          { label: "Difference", value: Math.abs(comparison.difference), format: "currency", hint: `${winner} ahead in this scenario` },
          { label: "SIP gain", value: comparison.sip.gain, format: "currency" },
        ],
        chart: {
          type: "line",
          xKey: "year",
          xLabel: "Year",
          series: [
            { key: "lumpsum", label: "Lumpsum", color: "#2563eb" },
            { key: "sip", label: "SIP", color: "#0f766e" },
          ],
          data: comparison.series,
        },
        notes: [
          "Lumpsum assumes the full amount is invested on day one, which carries more timing risk.",
          "SIP reduces timing risk but keeps part of the money out of the market for longer.",
        ],
      }
    },
  },
  {
    slug: "emi",
    name: "EMI Calculator",
    category: "Loans",
    tagline: "Monthly loan instalment",
    description: "Calculate the EMI, total interest and yearly repayment split for a loan.",
    formula: "EMI = P × i × (1 + i)^n / ((1 + i)^n − 1)",
    assumptions: [
      "Fixed interest rate for the whole tenure.",
      "No processing fees, insurance or prepayments are included.",
    ],
    fields: [
      { key: "principal", label: "Loan amount", type: "currency", defaultValue: 2500000, min: 0, step: 50000 },
      { key: "annualRate", label: "Interest rate", type: "percent", defaultValue: 8.5, min: 0, max: 30, step: 0.1 },
      { key: "years", label: "Tenure", type: "years", defaultValue: 20, min: 0.5, max: 40, step: 0.5 },
    ],
    compute: ({ principal, annualRate, years }) => {
      const schedule = loanSchedule(principal, annualRate, years)
      return {
        results: [
          { label: "Monthly EMI", value: schedule.monthlyEmi, format: "currency", emphasis: true },
          { label: "Total repayment", value: schedule.totalPayment, format: "currency" },
          { label: "Total interest", value: schedule.totalInterest, format: "currency" },
          {
            label: "Interest as % of loan",
            value: principal > 0 ? Number(((schedule.totalInterest / principal) * 100).toFixed(1)) : 0,
            format: "percent",
          },
        ],
        chart: {
          type: "bar",
          xKey: "year",
          xLabel: "Year",
          series: [
            { key: "principalPaid", label: "Principal repaid", color: "#0f766e" },
            { key: "interestPaid", label: "Interest paid", color: "#f59e0b" },
          ],
          data: schedule.schedule.map((row) => ({
            year: row.year,
            principalPaid: row.principalPaid,
            interestPaid: row.interestPaid,
          })),
        },
        notes: [`Interest is computed on the reducing balance at ${annualRate}% per year.`],
      }
    },
  },
  {
    slug: "loan-prepayment",
    name: "Loan Prepayment Calculator",
    category: "Loans",
    tagline: "What an extra payment saves",
    description:
      "See how much interest and time you save by paying extra each month on top of your EMI.",
    formula:
      "The same EMI plus an extra amount is applied every month until the outstanding balance reaches zero.",
    assumptions: [
      "Extra payment is made every month, not as a one-time lump sum.",
      "No prepayment penalty is charged.",
    ],
    fields: [
      { key: "principal", label: "Outstanding loan", type: "currency", defaultValue: 2500000, min: 0, step: 50000 },
      { key: "annualRate", label: "Interest rate", type: "percent", defaultValue: 8.5, min: 0, max: 30, step: 0.1 },
      { key: "years", label: "Remaining tenure", type: "years", defaultValue: 20, min: 0.5, max: 40, step: 0.5 },
      { key: "extraMonthly", label: "Extra payment per month", type: "currency", defaultValue: 10000, min: 0, step: 1000 },
    ],
    compute: ({ principal, annualRate, years, extraMonthly }) => {
      const result = prepaymentImpact({ principal, annualRate, years, extraMonthly })
      return {
        results: [
          { label: "Interest saved", value: result.interestSaved, format: "currency", emphasis: true },
          { label: "Time saved", value: result.monthsSaved, format: "months" },
          { label: "New interest cost", value: result.newInterest, format: "currency" },
          { label: "Original interest cost", value: result.baselineInterest, format: "currency" },
          { label: "New monthly outgo", value: result.monthlyOutgo, format: "currency" },
        ],
        notes:
          extraMonthly <= 0
            ? ["Add an extra monthly payment to see the effect."]
            : [`The loan closes in about ${Math.ceil(result.newTenureMonths / 12)} years instead of ${Math.round(years)} years.`],
      }
    },
  },
  {
    slug: "retirement-corpus",
    name: "Retirement Corpus Calculator",
    category: "Planning",
    tagline: "How much you need to retire",
    description:
      "Estimate the corpus required at retirement so your inflation-adjusted expenses are covered for life.",
    formula:
      "Corpus = annual expense at retirement × annuity factor at the real (post-inflation) return over retirement years.",
    assumptions: [
      "Expenses grow with inflation until retirement.",
      "Post-retirement returns are net of inflation.",
      "Life expectancy defines the withdrawal period.",
    ],
    fields: [
      { key: "monthlyExpense", label: "Monthly expenses today", type: "currency", defaultValue: 50000, min: 0, step: 5000 },
      { key: "currentAge", label: "Current age", type: "years", defaultValue: 30, min: 18, max: 80, step: 1 },
      { key: "retirementAge", label: "Retirement age", type: "years", defaultValue: 60, min: 30, max: 90, step: 1 },
      { key: "inflationPercent", label: "Inflation", type: "percent", defaultValue: 6, min: 0, max: 15, step: 0.5 },
      { key: "postRetirementReturn", label: "Post-retirement return", type: "percent", defaultValue: 8, min: 0, max: 20, step: 0.5 },
      { key: "lifeExpectancy", label: "Life expectancy", type: "years", defaultValue: 85, min: 50, max: 110, step: 1 },
    ],
    compute: ({ monthlyExpense, currentAge, retirementAge, inflationPercent, postRetirementReturn, lifeExpectancy }) => {
      if (retirementAge <= currentAge) {
        throw new CalculationError("Retirement age must be greater than current age")
      }
      if (lifeExpectancy <= retirementAge) {
        throw new CalculationError("Life expectancy must be greater than retirement age")
      }
      const result = retirementCorpus({
        monthlyExpense,
        currentAge,
        retirementAge,
        inflationPercent,
        postRetirementReturn,
        lifeExpectancy,
      })
      return {
        results: [
          { label: "Corpus required", value: result.corpusRequired, format: "currency", emphasis: true },
          { label: "Years to retirement", value: result.yearsToRetirement, format: "years" },
          { label: "Monthly expense at retirement", value: result.monthlyExpenseAtRetirement, format: "currency" },
          { label: "Real return after inflation", value: result.realReturn, format: "percent" },
        ],
        notes: [
          `This covers ${result.retirementYears} years of retirement spending.`,
          "Medical emergencies, taxes and one-off expenses are not included.",
        ],
      }
    },
  },
  {
    slug: "fire",
    name: "FIRE Calculator",
    category: "Planning",
    tagline: "Financial independence target",
    description:
      "Estimate the corpus for financial independence using a safe withdrawal rate and see your progress.",
    formula: "FIRE number = annual expenses ÷ safe withdrawal rate",
    assumptions: [
      "The withdrawal rate is a planning assumption, not a guarantee.",
      "Returns before and after FIRE are assumed constant.",
    ],
    fields: [
      { key: "annualExpenses", label: "Annual expenses", type: "currency", defaultValue: 600000, min: 0, step: 25000 },
      { key: "withdrawalRate", label: "Safe withdrawal rate", type: "percent", defaultValue: 4, min: 1, max: 10, step: 0.25 },
      { key: "netWorth", label: "Current invested net worth", type: "currency", defaultValue: 1000000, min: 0, step: 50000 },
      { key: "monthlyInvestment", label: "Monthly investment", type: "currency", defaultValue: 30000, min: 0, step: 1000 },
      { key: "expectedReturn", label: "Expected annual return", type: "percent", defaultValue: 10, min: 0, max: 25, step: 0.5 },
    ],
    compute: ({ annualExpenses, withdrawalRate, netWorth, monthlyInvestment, expectedReturn }) => {
      const result = fireNumber({
        annualExpenses,
        withdrawalRate,
        currentNetWorth: netWorth,
        monthlyInvestment,
        expectedReturn,
      })
      return {
        results: [
          { label: "FIRE number", value: result.fireNumber, format: "currency", emphasis: true },
          { label: "Progress", value: result.progressPercent, format: "percent" },
          {
            label: "Years to FIRE",
            value: result.yearsToFire ?? 0,
            format: "years",
            hint: result.yearsToFire === null ? "Increase the monthly investment to reach the target" : undefined,
          },
          { label: "Monthly SIP needed", value: result.requiredMonthly, format: "currency" },
        ],
        notes: [
          "Time-to-FIRE ignores taxes and assumes steady contributions and returns.",
          "A lower withdrawal rate needs a larger corpus but is more resilient.",
        ],
      }
    },
  },
  {
    slug: "goal-planner",
    name: "Goal Planner",
    category: "Planning",
    tagline: "Monthly saving for a target",
    description:
      "Work out the monthly investment needed to reach a financial goal from your current savings.",
    formula: "Required SIP = (goal − future value of current savings) ÷ annuity factor",
    assumptions: ["Assumes a constant return and monthly contributions at month end."],
    fields: [
      { key: "target", label: "Goal amount", type: "currency", defaultValue: 5000000, min: 0, step: 100000 },
      { key: "current", label: "Amount already saved", type: "currency", defaultValue: 200000, min: 0, step: 10000 },
      { key: "annualReturn", label: "Expected annual return", type: "percent", defaultValue: 10, min: 0, max: 25, step: 0.5 },
      { key: "years", label: "Years to goal", type: "years", defaultValue: 10, min: 0.5, max: 50, step: 0.5 },
    ],
    compute: ({ target, current, annualReturn, years }) => {
      const plan = goalPlan({ target, current, annualReturn, years })
      return {
        results: [
          { label: "Monthly investment needed", value: plan.monthlyRequired, format: "currency", emphasis: true },
          { label: "Your contributions", value: plan.totalContribution, format: "currency" },
          { label: "Growth on current savings", value: plan.existingGrowth, format: "currency" },
          { label: "Gap to close", value: plan.shortfall, format: "currency" },
        ],
        notes: plan.monthlyRequired === 0 ? ["Your current savings are projected to reach the goal on their own."] : [],
      }
    },
  },
  {
    slug: "education-cost",
    name: "Education Cost Calculator",
    category: "Planning",
    tagline: "Future cost of education",
    description: "Project the future annual and four-year cost of education after inflation.",
    formula: "Future cost = current cost × (1 + inflation)^years",
    assumptions: ["Education inflation is assumed constant.", "Four-year cost ignores fee changes during the course."],
    fields: [
      { key: "currentAnnualCost", label: "Current annual cost", type: "currency", defaultValue: 300000, min: 0, step: 25000 },
      { key: "years", label: "Years until admission", type: "years", defaultValue: 12, min: 0, max: 30, step: 1 },
      { key: "inflationPercent", label: "Education inflation", type: "percent", defaultValue: 8, min: 0, max: 20, step: 0.5 },
    ],
    compute: ({ currentAnnualCost, years, inflationPercent }) => {
      const cost = educationCost({ currentAnnualCost, years, inflationPercent })
      return {
        results: [
          { label: "Future annual cost", value: cost.futureAnnualCost, format: "currency", emphasis: true },
          { label: "Four-year cost", value: cost.futureFourYearCost, format: "currency" },
          { label: "Inflation multiplier", value: cost.inflationFactor, format: "number" },
        ],
      }
    },
  },
  {
    slug: "emergency-fund",
    name: "Emergency Fund Calculator",
    category: "Personal finance",
    tagline: "Safety net target",
    description: "Size an emergency fund based on monthly expenses and how many months of cover you want.",
    formula: "Target = monthly expenses × months of cover",
    assumptions: ["Emergency fund should be held in liquid, low-risk instruments."],
    fields: [
      { key: "monthlyExpenses", label: "Monthly expenses", type: "currency", defaultValue: 50000, min: 0, step: 5000 },
      { key: "months", label: "Months of cover", type: "number", defaultValue: 6, min: 1, max: 24, step: 1 },
    ],
    compute: ({ monthlyExpenses, months }) => {
      const fund = emergencyFund(monthlyExpenses, months)
      return {
        results: [
          { label: "Emergency fund target", value: fund.target, format: "currency", emphasis: true },
          { label: "Monthly expenses", value: fund.perMonth, format: "currency" },
          { label: "Per month of cover", value: monthlyExpenses, format: "currency" },
        ],
        notes: ["Three to six months is typical; freelancers and single-income households often keep more."],
      }
    },
  },
  {
    slug: "net-worth",
    name: "Net Worth Calculator",
    category: "Personal finance",
    tagline: "Assets minus liabilities",
    description: "Add up what you own and owe to see your net worth and debt ratio.",
    formula: "Net worth = total assets − total liabilities",
    assumptions: ["Use current market values for assets and outstanding balances for debts."],
    fields: [
      { key: "cash", label: "Cash and bank balances", type: "currency", defaultValue: 200000, min: 0, step: 10000 },
      { key: "investments", label: "Investments", type: "currency", defaultValue: 800000, min: 0, step: 50000 },
      { key: "property", label: "Property and real estate", type: "currency", defaultValue: 0, min: 0, step: 100000 },
      { key: "otherAssets", label: "Other assets", type: "currency", defaultValue: 0, min: 0, step: 10000 },
      { key: "loans", label: "Loans outstanding", type: "currency", defaultValue: 0, min: 0, step: 50000 },
      { key: "creditCards", label: "Credit card dues", type: "currency", defaultValue: 0, min: 0, step: 5000 },
      { key: "otherLiabilities", label: "Other liabilities", type: "currency", defaultValue: 0, min: 0, step: 10000 },
    ],
    compute: ({ cash, investments, property, otherAssets, loans, creditCards, otherLiabilities }) => {
      const summary = netWorthSummary({
        cash,
        investments,
        property,
        otherAssets,
        loans,
        creditCards,
        otherLiabilities,
      })
      return {
        results: [
          { label: "Net worth", value: summary.netWorth, format: "currency", emphasis: true },
          { label: "Total assets", value: summary.assets, format: "currency" },
          { label: "Total liabilities", value: summary.liabilities, format: "currency" },
          { label: "Debt to assets", value: summary.debtToAssetRatio, format: "percent" },
        ],
        chart: {
          type: "bar",
          xKey: "label",
          xLabel: "Category",
          series: [{ key: "amount", label: "Amount", color: "#0f766e" }],
          data: summary.chart,
        },
      }
    },
  },
  {
    slug: "savings-rate",
    name: "Savings Rate Calculator",
    category: "Personal finance",
    tagline: "How much of your income you keep",
    description: "Calculate your monthly and annual savings rate from income and expenses.",
    formula: "Savings rate = (income − expenses) ÷ income × 100",
    assumptions: ["Uses take-home income after tax.", "Excludes irregular income and one-off expenses."],
    fields: [
      { key: "monthlyIncome", label: "Monthly take-home income", type: "currency", defaultValue: 100000, min: 0, step: 5000 },
      { key: "monthlyExpenses", label: "Monthly expenses", type: "currency", defaultValue: 70000, min: 0, step: 5000 },
    ],
    compute: ({ monthlyIncome, monthlyExpenses }) => {
      if (monthlyIncome <= 0) throw new CalculationError("Income must be greater than zero")
      const result = savingsRate(monthlyIncome, monthlyExpenses)
      return {
        results: [
          { label: "Savings rate", value: result.rate, format: "percent", emphasis: true },
          { label: "Monthly savings", value: result.savings, format: "currency" },
          { label: "Annual savings", value: result.annualSavings, format: "currency" },
        ],
        notes: result.rate < 0 ? ["Expenses exceed income this month."] : [],
      }
    },
  },
  {
    slug: "average-buy-price",
    name: "Average Buy Price Calculator",
    category: "Stocks",
    tagline: "Weighted cost of a position",
    description: "Find the weighted average price across up to three purchases of the same stock.",
    formula: "Average price = total cost ÷ total quantity",
    assumptions: ["Brokerage and taxes are ignored unless included in the prices you enter."],
    fields: [
      { key: "quantity1", label: "Quantity — purchase 1", type: "number", defaultValue: 50, min: 0, step: 1 },
      { key: "price1", label: "Price — purchase 1", type: "currency", defaultValue: 2450, min: 0, step: 1 },
      { key: "quantity2", label: "Quantity — purchase 2", type: "number", defaultValue: 25, min: 0, step: 1 },
      { key: "price2", label: "Price — purchase 2", type: "currency", defaultValue: 2600, min: 0, step: 1 },
      { key: "quantity3", label: "Quantity — purchase 3 (optional)", type: "number", defaultValue: 0, min: 0, step: 1 },
      { key: "price3", label: "Price — purchase 3 (optional)", type: "currency", defaultValue: 0, min: 0, step: 1 },
    ],
    compute: ({ quantity1, price1, quantity2, price2, quantity3, price3 }) => {
      const purchases = [
        { quantity: quantity1, price: price1 },
        { quantity: quantity2, price: price2 },
        { quantity: quantity3, price: price3 },
      ].filter((purchase) => purchase.quantity > 0)

      const average = averageBuyPrice(purchases)
      if (average === null) throw new CalculationError("Enter at least one purchase with a quantity")

      const totalQuantity = purchases.reduce((sum, purchase) => sum + purchase.quantity, 0)
      const totalCost = purchases.reduce((sum, purchase) => sum + purchase.quantity * purchase.price, 0)

      return {
        results: [
          { label: "Average buy price", value: average, format: "currency", emphasis: true },
          { label: "Total quantity", value: Number(totalQuantity.toFixed(4)), format: "number" },
          { label: "Total invested", value: Number(totalCost.toFixed(2)), format: "currency" },
        ],
      }
    },
  },
  {
    slug: "dividend-yield",
    name: "Dividend Yield Calculator",
    category: "Stocks",
    tagline: "Income from dividends",
    description: "Estimate annual dividend income and yield from a holding.",
    formula: "Dividend yield = dividend per share ÷ share price × 100",
    assumptions: ["Dividends are assumed to stay at the level you enter.", "Taxes on dividends are not deducted."],
    fields: [
      { key: "shares", label: "Number of shares", type: "number", defaultValue: 100, min: 0, step: 1 },
      { key: "dividendPerShare", label: "Annual dividend per share", type: "currency", defaultValue: 20, min: 0, step: 1 },
      { key: "pricePerShare", label: "Current share price", type: "currency", defaultValue: 500, min: 0, step: 1 },
    ],
    compute: ({ shares, dividendPerShare, pricePerShare }) => {
      if (pricePerShare <= 0) throw new CalculationError("Share price must be greater than zero")
      const result = dividendSummary({ shares, dividendPerShare, pricePerShare })
      return {
        results: [
          { label: "Annual dividend income", value: result.annualIncome, format: "currency", emphasis: true },
          { label: "Dividend yield", value: result.yieldPercent, format: "percent" },
          { label: "Monthly average", value: result.monthlyIncome, format: "currency" },
          { label: "Position value", value: result.costOnInvestment, format: "currency" },
        ],
      }
    },
  },
  {
    slug: "capital-gains",
    name: "Capital Gains Calculator",
    category: "Tax & costs",
    tagline: "Indian equity tax estimate",
    description:
      "Estimate short-term or long-term capital gains tax on an Indian equity sale under the post-July-2024 rates.",
    formula:
      "STCG (≤12 months): 20%. LTCG (>12 months): 12.5% on gains above ₹1,25,000 per financial year.",
    assumptions: [
      "Rates reflect the regime effective after 23 July 2024 and may change.",
      "Assumes this is the only equity sale in the financial year.",
      "Surcharge, cess and other income are not included.",
    ],
    fields: [
      { key: "buyPrice", label: "Buy price per share", type: "currency", defaultValue: 1000, min: 0, step: 10 },
      { key: "sellPrice", label: "Sell price per share", type: "currency", defaultValue: 1500, min: 0, step: 10 },
      { key: "quantity", label: "Quantity", type: "number", defaultValue: 100, min: 0, step: 1 },
      { key: "holdingMonths", label: "Holding period (months)", type: "number", defaultValue: 18, min: 0, max: 600, step: 1 },
    ],
    compute: ({ buyPrice, sellPrice, quantity, holdingMonths }) => {
      const result = equityCapitalGains({ buyPrice, sellPrice, quantity, holdingMonths })
      return {
        results: [
          { label: "Capital gain", value: result.gain, format: "currency", emphasis: true },
          { label: "Estimated tax", value: result.tax, format: "currency" },
          { label: "Net gain after tax", value: result.netGain, format: "currency" },
          { label: "Effective tax rate", value: result.effectiveRate, format: "percent" },
        ],
        notes: [
          `${result.type} treatment applies for a ${holdingMonths}-month holding period.`,
          result.type === "LTCG"
            ? `Long-term exemption of ₹1,25,000 used: ₹${result.exemptionUsed.toLocaleString("en-IN")}.`
            : "Short-term gains have no exemption.",
          "Educational estimate only, not tax advice.",
        ],
      }
    },
  },
  {
    slug: "expense-ratio",
    name: "Expense Ratio Impact",
    category: "Tax & costs",
    tagline: "What fund fees really cost",
    description:
      "See how much a fund's annual expense ratio reduces your long-term corpus compared with a cheaper fund.",
    formula: "Net return = gross return − expense ratio; compare compounded values.",
    assumptions: ["Expense ratio is constant over the period.", "No exit load or taxes are applied."],
    fields: [
      { key: "principal", label: "Investment amount", type: "currency", defaultValue: 1000000, min: 0, step: 50000 },
      { key: "grossReturn", label: "Gross annual return", type: "percent", defaultValue: 12, min: 0, max: 30, step: 0.5 },
      { key: "expenseRatio", label: "Expense ratio", type: "percent", defaultValue: 1.5, min: 0, max: 5, step: 0.1 },
      { key: "years", label: "Investment period", type: "years", defaultValue: 20, min: 1, max: 40, step: 1 },
    ],
    compute: ({ principal, grossReturn, expenseRatio, years }) => {
      const result = expenseRatioImpact({ principal, grossReturn, expenseRatio, years })
      return {
        results: [
          { label: "Cost of fees", value: result.cost, format: "currency", emphasis: true },
          { label: "Value with fees", value: result.withCost, format: "currency" },
          { label: "Value without fees", value: result.withoutCost, format: "currency" },
          { label: "Fees as % of gains", value: result.costPercentOfGain, format: "percent" },
        ],
        chart: {
          type: "line",
          xKey: "year",
          xLabel: "Year",
          series: [
            { key: "withoutCost", label: "Without fees", color: "#94a3b8" },
            { key: "withCost", label: "With fees", color: "#0f766e" },
          ],
          data: result.series,
        },
      }
    },
  },
  {
    slug: "inflation",
    name: "Inflation Calculator",
    category: "Returns",
    tagline: "What things will cost later",
    description:
      "See the future cost of today's expenses and how much purchasing power money loses over time.",
    formula: "Future cost = present cost × (1 + inflation)^years",
    assumptions: ["Assumes a constant inflation rate.", "Actual category-specific inflation may differ."],
    fields: [
      { key: "amount", label: "Current amount", type: "currency", defaultValue: 50000, min: 0, step: 5000 },
      { key: "inflationPercent", label: "Inflation rate", type: "percent", defaultValue: 6, min: 0, max: 20, step: 0.5 },
      { key: "years", label: "Years from now", type: "years", defaultValue: 10, min: 0, max: 50, step: 1 },
    ],
    compute: ({ amount, inflationPercent, years }) => {
      const result = inflationImpact(amount, inflationPercent, years)
      return {
        results: [
          { label: "Future cost", value: result.futureCost, format: "currency", emphasis: true },
          { label: "Today's money will be worth", value: result.futureValueOfToday, format: "currency" },
          { label: "Purchasing power lost", value: result.purchasingPowerLoss, format: "currency" },
          { label: "Cost multiplier", value: result.multiplier, format: "number" },
        ],
      }
    },
  },
]

export const calculatorCategories = [
  "Returns",
  "Withdrawals",
  "Loans",
  "Planning",
  "Personal finance",
  "Stocks",
  "Tax & costs",
] as const

export function getCalculator(slug: string): CalculatorDefinition | undefined {
  return calculators.find((calculator) => calculator.slug === slug)
}

export function getCalculators(): CalculatorDefinition[] {
  return calculators
}

export function getCalculatorsByCategory(): { category: string; items: CalculatorDefinition[] }[] {
  return calculatorCategories
    .map((category) => ({
      category,
      items: calculators.filter((calculator) => calculator.category === category),
    }))
    .filter((group) => group.items.length > 0)
}
