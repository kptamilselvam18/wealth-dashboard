import { prisma } from "@/lib/prisma"
import {
  calculateAllocation,
  calculateNetWorth,
  calculateProfitLoss,
  calculateReturn,
} from "@/utils/financial-calculations"
import type {
  AllocationSlice,
  HoldingRow,
  MonthlyPoint,
  PerformancePoint,
  Performer,
  Summary,
  TransactionRow,
} from "@/lib/summary-types"

const ALLOCATION_COLORS = [
  "#0d9488",
  "#2563eb",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#f97316",
  "#64748b",
]

const CASH_TYPE = "cash"

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export async function getPortfolioSummary(userId: string): Promise<Summary> {
  const sixMonthsAgo = startOfMonth(
    new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
  )

  const [holdings, liabilities, snapshots, monthlyTransactions, recentTransactions] =
    await Promise.all([
      prisma.holding.findMany({
        where: { userId },
        include: {
          asset: {
            include: {
              assetType: true,
              priceHistory: { orderBy: { date: "desc" }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.liability.findMany({ where: { userId } }),
      prisma.portfolioSnapshot.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 24,
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: { in: ["BUY", "SIP"] },
          date: { gte: sixMonthsAgo },
        },
        select: { date: true, totalAmount: true },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 8,
        include: { asset: { select: { name: true, symbol: true } } },
      }),
    ])

  let totalInvested = 0
  let totalCurrentValue = 0
  let totalCash = 0
  let pricesAsOf: Date | null = null
  const valuesByType: Record<string, number> = {}
  const rows: HoldingRow[] = []

  for (const holding of holdings) {
    const latestPrice = holding.asset.priceHistory[0]
    const currentPrice = latestPrice?.price ?? holding.averagePrice
    const invested = holding.quantity * holding.averagePrice
    const currentValue = holding.quantity * currentPrice
    const isCash = holding.asset.assetType.name === CASH_TYPE

    if (!isCash && latestPrice && (!pricesAsOf || latestPrice.date > pricesAsOf)) {
      pricesAsOf = latestPrice.date
    }

    if (isCash) {
      totalCash += currentValue
    } else {
      totalInvested += invested
      totalCurrentValue += currentValue
    }

    const typeName = isCash ? "Cash" : holding.asset.assetType.displayName
    valuesByType[typeName] = (valuesByType[typeName] ?? 0) + currentValue

    rows.push({
      id: holding.id,
      assetId: holding.asset.id,
      name: holding.asset.name,
      symbol: holding.asset.symbol,
      type: typeName,
      quantity: holding.quantity,
      averagePrice: holding.averagePrice,
      currentPrice,
      priceSource: latestPrice?.source ?? null,
      priceAsOf: latestPrice?.date.toISOString() ?? null,
      invested,
      currentValue,
      pnl: calculateProfitLoss(currentValue, invested),
      returnPercent: calculateReturn(invested, currentValue),
    })
  }

  const totalLiabilities = liabilities.reduce(
    (sum, liability) => sum + liability.outstandingAmount,
    0
  )
  const totalAssets = totalCurrentValue + totalCash
  const allocationTotal = totalAssets
  const allocationPercentages = calculateAllocation(valuesByType, allocationTotal)

  const allocation: AllocationSlice[] = Object.entries(valuesByType)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], index) => ({
      name,
      value,
      percent: allocationPercentages[name] ?? 0,
      color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
    }))

  const performance: PerformancePoint[] = [...snapshots]
    .reverse()
    .map((snapshot) => ({
      date: snapshot.date.toISOString(),
      value: snapshot.totalValue,
      invested: snapshot.investedValue,
    }))

  const months: MonthlyPoint[] = []
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1)
    const key = monthKey(date)
    const amount = monthlyTransactions
      .filter((transaction) => monthKey(transaction.date) === key)
      .reduce((sum, transaction) => sum + transaction.totalAmount, 0)
    months.push({
      month: date.toLocaleDateString("en-IN", { month: "short" }),
      amount,
    })
  }

  const investmentRows = rows.filter((row) => row.type !== "Cash")
  const sortedByReturn = [...investmentRows].sort(
    (a, b) => b.returnPercent - a.returnPercent
  )

  const performers = sortedByReturn.map<Performer>((row) => ({
    name: row.name,
    symbol: row.symbol,
    returnPercent: row.returnPercent,
  }))

  const transactions: TransactionRow[] = recentTransactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    name: transaction.asset.name,
    symbol: transaction.asset.symbol,
    quantity: transaction.quantity,
    price: transaction.price,
    totalAmount: transaction.totalAmount,
    fee: transaction.fee,
    date: transaction.date.toISOString(),
    notes: transaction.notes,
  }))

  return {
    totalInvested,
    totalCurrentValue,
    totalCash,
    totalLiabilities,
    totalAssets,
    netWorth: calculateNetWorth(totalAssets, totalLiabilities),
    totalPnl: calculateProfitLoss(totalCurrentValue, totalInvested),
    overallReturn: calculateReturn(totalInvested, totalCurrentValue),
    allocation,
    holdings: rows,
    recentTransactions: transactions,
    pricesAsOf: pricesAsOf?.toISOString() ?? null,
    performance,
    monthlyInvestments: months,
    topPerformers: performers.slice(0, 3),
    underPerformers: performers.slice(-3).reverse().filter((p) => p.returnPercent < 0),
  }
}

/** Store the current portfolio value so the performance chart has real history. */
export async function recordSnapshot(userId: string): Promise<void> {
  const summary = await getPortfolioSummary(userId)
  const data = {
    totalValue: summary.totalCurrentValue + summary.totalCash,
    investedValue: summary.totalInvested,
    pnl: summary.totalPnl,
    netWorth: summary.netWorth,
  }

  // One snapshot per calendar day: refreshing prices or editing a holding should
  // refine today's value, not clutter the performance chart with intraday noise.
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const existing = await prisma.portfolioSnapshot.findFirst({
    where: { userId, date: { gte: startOfDay } },
    orderBy: { date: "desc" },
  })

  if (existing) {
    await prisma.portfolioSnapshot.update({ where: { id: existing.id }, data })
  } else {
    await prisma.portfolioSnapshot.create({ data: { userId, ...data } })
  }
}

export { calculateReturn, calculateProfitLoss, calculateNetWorth }
