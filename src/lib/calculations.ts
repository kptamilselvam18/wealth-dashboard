import { PrismaClient } from "@prisma/client"
import { calculateXIRR, calculateMutualFundXIRR, calculateReturn, calculateProfitLoss, calculateNetWorth, calculateAllocation } from "@/utils/financial-calculations"

const prisma = new PrismaClient()

export async function getPortfolioSummary(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    include: {
      asset: {
        include: {
          assetType: true,
          priceHistory: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      },
    },
  })

  let totalInvested = 0
  let totalCurrentValue = 0
  let totalCash = 0
  let totalLiabilities = 0
  const allocationByType: { [key: string]: number } = {}
  const holdingDetails: any[] = []

  for (const holding of holdings) {
    const currentPrice = holding.asset.priceHistory[0]?.price || holding.averagePrice
    const invested = holding.quantity * holding.averagePrice
    const currentValue = holding.quantity * currentPrice
    const pnl = currentValue - invested
    const returnPercent = calculateReturn(invested, currentValue)
    
    totalInvested += invested
    totalCurrentValue += currentValue
    
    const type = holding.asset.assetType.name
    allocationByType[type] = (allocationByType[type] || 0) + currentValue
    
    holdingDetails.push({
      id: holding.id,
      name: holding.asset.name,
      symbol: holding.asset.symbol,
      assetType: holding.asset.assetType.displayName,
      quantity: holding.quantity,
      averagePrice: holding.averagePrice,
      currentPrice,
      invested,
      currentValue,
      pnl,
      returnPercent,
    })
  }

  const liabilities = await prisma.liability.findMany({
    where: { userId },
  })
  totalLiabilities = liabilities.reduce((sum, l) => sum + l.outstandingAmount, 0)

  const totalAssets = totalCurrentValue + totalCash
  const netWorth = calculateNetWorth(totalAssets, totalLiabilities)
  const totalPnL = calculateProfitLoss(totalCurrentValue, totalInvested)
  const overallReturn = calculateReturn(totalInvested, totalCurrentValue)
  const allocation = calculateAllocation(allocationByType, totalCurrentValue)

  return {
    totalInvested,
    totalCurrentValue,
    totalCash,
    totalLiabilities,
    totalAssets,
    netWorth,
    totalPnL,
    overallReturn,
    allocation,
    holdings: holdingDetails,
  }
}

export async function getAssetXIRR(userId: string, assetId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { userId, assetId },
    orderBy: { date: "asc" },
  })

  if (transactions.length < 2) {
    return 0
  }

  const investedAmounts: number[] = []
  const investedDates: Date[] = []
  let totalInvested = 0
  let totalQuantity = 0
  let totalCost = 0

  for (const txn of transactions) {
    if (txn.type === "BUY") {
      investedAmounts.push(txn.totalAmount)
      investedDates.push(txn.date)
      totalQuantity += txn.quantity
      totalCost += txn.totalAmount
    } else if (txn.type === "SELL") {
      const sellRatio = txn.quantity / totalQuantity
      const reduction = totalCost * sellRatio
      totalCost -= reduction
      totalQuantity -= txn.quantity
    }
  }

  const latestPrice = await prisma.priceHistory.findFirst({
    where: { assetId },
    orderBy: { date: "desc" },
  })

  const currentValue = latestPrice ? totalQuantity * latestPrice.price : 0
  const currentDate = new Date()

  if (investedAmounts.length === 0) {
    return 0
  }

  return calculateMutualFundXIRR(
    investedAmounts,
    investedDates,
    currentValue,
    currentDate
  )
}

export async function createPortfolioSnapshot(userId: string) {
  const summary = await getPortfolioSummary(userId)
  
  await prisma.portfolioSnapshot.create({
    data: {
      userId,
      totalValue: summary.totalCurrentValue,
      investedValue: summary.totalInvested,
      pnl: summary.totalPnL,
      netWorth: summary.netWorth,
    },
  })
}

export {
  calculateXIRR,
  calculateMutualFundXIRR,
  calculateReturn,
  calculateProfitLoss,
  calculateNetWorth,
  calculateAllocation,
}