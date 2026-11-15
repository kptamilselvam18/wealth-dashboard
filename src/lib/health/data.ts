import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { computeFinancialHealth } from "./score"
import type {
  HealthInputs,
  HealthProfile,
  HealthResponse,
  HealthSnapshot,
} from "./types"

const CASH_TYPE = "cash"

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`
}

function toProfile(
  profile: { monthlyIncome: number | null; monthlyExpenses: number | null; age: number | null } | null
): HealthProfile {
  return {
    monthlyIncome: profile?.monthlyIncome ?? null,
    monthlyExpenses: profile?.monthlyExpenses ?? null,
    age: profile?.age ?? null,
  }
}

function toSnapshot(snapshot: {
  id: string
  score: number
  financialAge: number | null
  coverage: number
  createdAt: Date
}): HealthSnapshot {
  return {
    id: snapshot.id,
    score: snapshot.score,
    financialAge: snapshot.financialAge,
    coverage: snapshot.coverage,
    createdAt: snapshot.createdAt.toISOString(),
  }
}

export async function getFinancialHealth(userId: string): Promise<HealthResponse> {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [holdings, liabilities, goals, profile, earliest, contributions, history] =
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
      }),
      prisma.liability.findMany({ where: { userId } }),
      prisma.goal.findMany({
        where: { userId },
        select: { name: true, targetAmount: true, currentAmount: true, status: true },
      }),
      prisma.financialProfile.findUnique({ where: { userId } }),
      prisma.transaction.findFirst({
        where: { userId },
        orderBy: { date: "asc" },
        select: { date: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: { in: ["BUY", "SIP", "DEPOSIT"] },
          date: { gte: sixMonthsAgo },
        },
        select: { date: true },
      }),
      prisma.financialHealthSnapshot.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 24,
        select: {
          id: true,
          score: true,
          financialAge: true,
          coverage: true,
          createdAt: true,
        },
      }),
    ])

  let cash = 0
  let investments = 0
  let totalAssets = 0
  const classValues = new Map<string, number>()

  for (const holding of holdings) {
    const price = holding.asset.priceHistory[0]?.price ?? holding.averagePrice
    const value = holding.quantity * price
    const isCash = holding.asset.assetType.name === CASH_TYPE
    const className = isCash ? "Cash" : holding.asset.assetType.displayName

    totalAssets += value
    if (isCash) cash += value
    else investments += value

    classValues.set(className, (classValues.get(className) ?? 0) + value)
  }

  const totalLiabilities = liabilities.reduce(
    (sum, liability) => sum + liability.outstandingAmount,
    0
  )
  const monthlyEmi = liabilities.reduce((sum, liability) => sum + (liability.emi ?? 0), 0)

  const contributionMonths = new Set(contributions.map((item) => monthKey(item.date))).size
  const now = new Date()
  const monthsConsidered = earliest
    ? Math.min(
        6,
        Math.max(
          1,
          (now.getFullYear() - earliest.date.getFullYear()) * 12 +
            (now.getMonth() - earliest.date.getMonth()) +
            1
        )
      )
    : 0

  const inputs: HealthInputs = {
    cash,
    investments,
    totalAssets,
    totalLiabilities,
    monthlyEmi,
    monthlyIncome: profile?.monthlyIncome ?? null,
    monthlyExpenses: profile?.monthlyExpenses ?? null,
    assetClasses: Array.from(classValues.entries()).map(([name, value]) => ({ name, value })),
    holdingsCount: holdings.length,
    goals: goals.map((goal) => ({
      name: goal.name,
      target: goal.targetAmount,
      current: goal.currentAmount,
      status: goal.status,
    })),
    contributionMonths,
    monthsConsidered: Math.max(monthsConsidered, contributionMonths),
    hasTransactionHistory: Boolean(earliest),
    netWorth: totalAssets - totalLiabilities,
    age: profile?.age ?? null,
  }

  return {
    current: computeFinancialHealth(inputs),
    profile: toProfile(profile),
    history: history.map(toSnapshot),
  }
}

/** Freeze today's computed score so progress can be compared over time. */
export async function saveHealthCheckIn(userId: string): Promise<HealthSnapshot> {
  const { current } = await getFinancialHealth(userId)

  const snapshot = await prisma.financialHealthSnapshot.create({
    data: {
      userId,
      score: current.score,
      financialAge: current.financialAge.age,
      coverage: current.coverage,
      factors: current.factors as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      score: true,
      financialAge: true,
      coverage: true,
      createdAt: true,
    },
  })

  return toSnapshot(snapshot)
}
