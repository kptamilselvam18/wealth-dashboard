export type HealthFactorId =
  | "emergencyFund"
  | "savingsRate"
  | "debt"
  | "diversification"
  | "goals"
  | "consistency"

export interface HealthFactor {
  id: HealthFactorId
  label: string
  /** Relative importance of the factor within the overall score. */
  weight: number
  /** 0–100, or null when the underlying data is missing. */
  score: number | null
  /** Human-readable measured value, e.g. "4.2 months". */
  value: string
  /** What a healthy result looks like. */
  target: string
  /** Where the number came from. */
  evidence: string
  tip: string
  status: "measured" | "unknown"
}

export interface HealthMilestone {
  label: string
  credit: number
  status: "met" | "not-met" | "unknown"
  detail: string
}

export interface FinancialAgeResult {
  available: boolean
  age: number | null
  actualAge: number | null
  difference: number | null
  baseAge: number
  credits: number
  penalty: number
  milestones: HealthMilestone[]
  note: string
}

export interface HealthInputs {
  cash: number
  investments: number
  totalAssets: number
  totalLiabilities: number
  monthlyEmi: number
  monthlyIncome: number | null
  monthlyExpenses: number | null
  assetClasses: { name: string; value: number }[]
  holdingsCount: number
  goals: { name: string; target: number; current: number; status: string }[]
  /** Months in the last six with at least one contribution. */
  contributionMonths: number
  /** Months since the first recorded transaction, capped at 6. */
  monthsConsidered: number
  hasTransactionHistory: boolean
  netWorth: number
  age: number | null
}

export interface HealthResult {
  score: number
  grade: string
  gradeTone: "strong" | "good" | "fair" | "attention"
  coverage: number
  factors: HealthFactor[]
  strengths: string[]
  focusAreas: string[]
  unknownFactors: { label: string; howTo: string }[]
  financialAge: FinancialAgeResult
  computedAt: string
}

export interface HealthProfile {
  monthlyIncome: number | null
  monthlyExpenses: number | null
  age: number | null
}

export interface HealthSnapshot {
  id: string
  score: number
  financialAge: number | null
  coverage: number
  createdAt: string
}

export interface HealthResponse {
  current: HealthResult
  profile: HealthProfile
  history: HealthSnapshot[]
}

export interface HealthProfileResponse {
  profile: HealthProfile
}
