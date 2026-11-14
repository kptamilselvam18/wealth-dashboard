import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const DEMO_EMAIL = "demo@wealth.app"
const DEMO_PASSWORD = "demo1234"

const ASSET_TYPES = [
  { name: "stock", displayName: "Stock", description: "Listed equities" },
  { name: "mutual-fund", displayName: "Mutual Fund", description: "Mutual fund units" },
  { name: "fixed-deposit", displayName: "Fixed Deposit", description: "Bank fixed deposits" },
  { name: "gold", displayName: "Gold", description: "Gold and gold ETFs" },
  { name: "silver", displayName: "Silver", description: "Silver and silver ETFs" },
  { name: "cash", displayName: "Cash", description: "Bank and liquid balances" },
]

const daysAgo = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(12, 0, 0, 0)
  return date
}

const monthsAgo = (months) => {
  const date = new Date()
  date.setMonth(date.getMonth() - months, 12)
  date.setHours(12, 0, 0, 0)
  return date
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } })
  }

  for (const assetType of ASSET_TYPES) {
    await prisma.assetType.upsert({
      where: { name: assetType.name },
      update: { displayName: assetType.displayName, description: assetType.description },
      create: assetType,
    })
  }

  const assetTypes = await prisma.assetType.findMany()
  const typeId = (name) => {
    const found = assetTypes.find((type) => type.name === name)
    if (!found) throw new Error(`Missing asset type ${name}`)
    return found.id
  }

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo Investor",
      passwordHash,
    },
  })

  const portfolio = [
    {
      name: "Reliance Industries",
      symbol: "RELIANCE",
      type: "stock",
      quantity: 25,
      averagePrice: 2450,
      currentPrice: 2890.5,
    },
    {
      name: "Tata Consultancy Services",
      symbol: "TCS",
      type: "stock",
      quantity: 10,
      averagePrice: 3600,
      currentPrice: 3850.75,
    },
    {
      name: "HDFC Flexi Cap Fund",
      symbol: "HDFCFLEXI",
      type: "mutual-fund",
      quantity: 600,
      averagePrice: 520,
      currentPrice: 652.34,
    },
    {
      name: "ICICI Prudential Balanced Advantage",
      symbol: "ICICIPRUBA",
      type: "mutual-fund",
      quantity: 400,
      averagePrice: 55,
      currentPrice: 63.8,
    },
    {
      name: "SBI Fixed Deposit",
      symbol: "SBI-FD",
      type: "fixed-deposit",
      quantity: 1,
      averagePrice: 200000,
      currentPrice: 212400,
    },
    {
      name: "Gold ETF",
      symbol: "GOLD",
      type: "gold",
      quantity: 30,
      averagePrice: 6100,
      currentPrice: 7250,
    },
    {
      name: "Silver ETF",
      symbol: "SILVER",
      type: "silver",
      quantity: 100,
      averagePrice: 82,
      currentPrice: 92.5,
    },
    {
      name: "Savings Account",
      symbol: "CASH",
      type: "cash",
      quantity: 185000,
      averagePrice: 1,
      currentPrice: 1,
    },
  ]

  let totalValue = 0
  let totalInvested = 0

  for (const item of portfolio) {
    const asset = await prisma.asset.create({
      data: {
        userId: user.id,
        assetTypeId: typeId(item.type),
        name: item.name,
        symbol: item.symbol,
      },
    })

    const holding = await prisma.holding.create({
      data: {
        userId: user.id,
        assetId: asset.id,
        quantity: item.quantity,
        averagePrice: item.averagePrice,
      },
    })

    const invested = item.quantity * item.averagePrice
    const currentValue = item.quantity * item.currentPrice
    totalInvested += invested
    totalValue += currentValue

    // A few monthly price points so price history looks real.
    for (let month = 4; month >= 0; month -= 1) {
      const drift = 1 - month * 0.02
      await prisma.priceHistory.create({
        data: {
          assetId: asset.id,
          price: Number((item.currentPrice * drift).toFixed(2)),
          currency: "INR",
          date: monthsAgo(month),
          source: "manual",
        },
      })
    }

    const isCash = item.type === "cash"
    await prisma.transaction.create({
      data: {
        userId: user.id,
        assetId: asset.id,
        holdingId: holding.id,
        type: isCash ? "DEPOSIT" : "BUY",
        quantity: item.quantity,
        price: item.averagePrice,
        totalAmount: invested,
        date: monthsAgo(isCash ? 1 : 10),
        notes: isCash ? "Opening cash balance" : "Initial purchase",
      },
    })
  }

  // Monthly SIP into the flexi cap fund.
  const sipAsset = await prisma.asset.findFirst({
    where: { userId: user.id, symbol: "HDFCFLEXI" },
  })
  if (sipAsset) {
    for (let month = 5; month >= 1; month -= 1) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          assetId: sipAsset.id,
          type: "SIP",
          quantity: 0,
          price: 0,
          totalAmount: 10000,
          date: monthsAgo(month),
          notes: "Monthly SIP instalment",
        },
      })
    }
  }

  const dividendAsset = await prisma.asset.findFirst({
    where: { userId: user.id, symbol: "TCS" },
  })
  if (dividendAsset) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        assetId: dividendAsset.id,
        type: "DIVIDEND",
        quantity: 0,
        price: 0,
        totalAmount: 2400,
        date: daysAgo(35),
        notes: "Quarterly dividend",
      },
    })
  }

  await prisma.liability.createMany({
    data: [
      {
        userId: user.id,
        name: "Home Loan",
        type: "HOME_LOAN",
        outstandingAmount: 450000,
        interestRate: 8.6,
        emi: 9500,
      },
      {
        userId: user.id,
        name: "Credit Card",
        type: "CREDIT_CARD",
        outstandingAmount: 34500,
        interestRate: 36,
        emi: 5000,
      },
    ],
  })

  // Twelve monthly snapshots trending up to the current value.
  for (let month = 11; month >= 0; month -= 1) {
    const progress = (11 - month) / 11
    const factor = 0.72 + progress * 0.28
    const noise = 1 + Math.sin(progress * Math.PI * 3) * 0.015
    const value = Math.round(totalValue * factor * noise)
    const invested = Math.round(totalInvested * (0.8 + progress * 0.2))
    await prisma.portfolioSnapshot.create({
      data: {
        userId: user.id,
        totalValue: value,
        investedValue: invested,
        pnl: value - invested,
        netWorth: value - 484500,
        date: monthsAgo(month),
      },
    })
  }

  console.log(`Seeded demo account ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`Portfolio value ₹${totalValue.toLocaleString("en-IN")}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
