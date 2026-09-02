export function cn(...classes: (string | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export function calculateReturn(invested: number, currentValue: number): number {
  if (invested === 0) return 0
  return ((currentValue - invested) / invested) * 100
}

export function calculateProfitLoss(currentValue: number, investedValue: number): number {
  return currentValue - investedValue
}

export function calculateNetWorth(totalAssets: number, totalLiabilities: number): number {
  return totalAssets - totalLiabilities
}

export function calculateAllocation(
  assetValues: { [key: string]: number },
  totalValue: number
): { [key: string]: number } {
  const allocations: { [key: string]: number } = {}
  
  for (const [key, value] of Object.entries(assetValues)) {
    allocations[key] = totalValue > 0 ? (value / totalValue) * 100 : 0
  }
  
  return allocations
}

// XIRR calculation (simplified)
export function calculateXIRR(values: number[], dates: Date[]): number {
  if (values.length !== dates.length || values.length < 2) {
    return 0
  }

  const hasPositive = values.some((v) => v > 0)
  const hasNegative = values.some((v) => v < 0)
  
  if (!hasPositive || !hasNegative) {
    return 0
  }

  // Newton-Raphson method for XIRR
  const MAX_ITERATIONS = 100
  const TOLERANCE = 1e-10
  
  const firstDate = dates[0]
  const days = dates.map(d => (d.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
  
  let rate = 0.1
  
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let npv = 0
    let dnpd = 0
    
    for (let j = 0; j < values.length; j++) {
      const timeFactor = 1 / Math.pow(1 + rate, days[j] / 365)
      npv += values[j] * timeFactor
      dnpd += -(days[j] / 365) * values[j] / Math.pow(1 + rate, days[j] / 365 + 1)
    }
    
    if (Math.abs(dnpd) < TOLERANCE) {
      rate += (npv > 0 ? 0.001 : -0.001)
      continue
    }
    
    const newRate = rate - npv / dnpd
    
    if (Math.abs(newRate - rate) < TOLERANCE) {
      rate = newRate
      break
    }
    
    rate = newRate
  }
  
  return rate
}

export function calculateMutualFundXIRR(
  investedAmounts: number[],
  investedDates: Date[],
  currentValue: number,
  currentDate: Date
): number {
  const cashFlows = [...investedAmounts.map(a => -a), currentValue]
  const allDates = [...investedDates, currentDate]
  
  return calculateXIRR(cashFlows, allDates)
}