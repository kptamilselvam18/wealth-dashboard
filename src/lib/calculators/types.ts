export type CalculatorCategory =
  | "Returns"
  | "Withdrawals"
  | "Loans"
  | "Planning"
  | "Personal finance"
  | "Stocks"
  | "Tax & costs"

export type FieldType = "currency" | "percent" | "number" | "years"

export type CalculatorField = {
  key: string
  label: string
  type: FieldType
  defaultValue: number
  min?: number
  max?: number
  step?: number
  help?: string
}

export type ResultFormat = "currency" | "percent" | "number" | "years" | "months"

export type CalculatorResult = {
  label: string
  value: number
  format: ResultFormat
  hint?: string
  emphasis?: boolean
}

export type CalculatorChart = {
  type: "area" | "bar" | "line"
  xKey: string
  xLabel: string
  series: { key: string; label: string; color?: string }[]
  data: Record<string, number | string>[]
}

export type CalculatorOutput = {
  results: CalculatorResult[]
  chart?: CalculatorChart
  notes?: string[]
}

export type CalculatorDefinition = {
  slug: string
  name: string
  category: CalculatorCategory
  tagline: string
  description: string
  formula: string
  assumptions: string[]
  fields: CalculatorField[]
  compute: (values: Record<string, number>) => CalculatorOutput
}
