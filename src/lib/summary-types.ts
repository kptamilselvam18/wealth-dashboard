export type AllocationSlice = {
  name: string
  value: number
  percent: number
  color: string
}

export type HoldingRow = {
  id: string
  assetId: string
  name: string
  symbol: string | null
  type: string
  quantity: number
  averagePrice: number
  currentPrice: number
  priceSource: string | null
  priceAsOf: string | null
  invested: number
  currentValue: number
  pnl: number
  returnPercent: number
}

export type TransactionRow = {
  id: string
  type: string
  name: string
  symbol: string | null
  quantity: number
  price: number
  totalAmount: number
  fee: number | null
  date: string
  notes: string | null
}

export type PerformancePoint = {
  date: string
  value: number
  invested: number
}

export type MonthlyPoint = {
  month: string
  amount: number
}

export type Performer = {
  name: string
  symbol: string | null
  returnPercent: number
}

export type Summary = {
  totalInvested: number
  totalCurrentValue: number
  totalCash: number
  totalLiabilities: number
  totalAssets: number
  netWorth: number
  totalPnl: number
  overallReturn: number
  allocation: AllocationSlice[]
  holdings: HoldingRow[]
  pricesAsOf: string | null
  recentTransactions: TransactionRow[]
  performance: PerformancePoint[]
  monthlyInvestments: MonthlyPoint[]
  topPerformers: Performer[]
  underPerformers: Performer[]
}

export type AssetOption = {
  id: string
  name: string
  symbol: string | null
  type: string
  typeName: string
  quantity: number
  averagePrice: number
  currentPrice: number
  currentValue: number
}
