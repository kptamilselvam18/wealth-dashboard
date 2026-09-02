import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const MOCK_PRICES: Record<string, number> = {
  RELIANCE: 2850.50,
  TCS: 3850.75,
  HDFCBANK: 1650.25,
  INFY: 1550.80,
  "HDFC.NS": 2650.40,
  "RELIANCE.NS": 2850.50,
  "HDFCFLEXI": 652.34,
  "ICICIFLEXI": 589.12,
  "SBIHYBRID": 412.56,
  GOLD: 72500.00,
  SILVER: 82500.00,
  "SBI-FD": 6.8,
  "HDFC-FD": 7.0,
}

function getMockPrice(symbol: string): number {
  const normalizedSymbol = symbol.toUpperCase().replace(/\.NS$/, "").replace(/\.NSE$/, "")
  const price = MOCK_PRICES[normalizedSymbol]
  
  if (price) return price
  
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i)
    hash |= 0
  }
  
  return Math.abs(hash) % 9900 + 100
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get("symbols")

    if (!symbols) {
      return NextResponse.json({ error: "Symbols parameter is required" }, { status: 400 })
    }

    const symbolArray = symbols.split(",").map(s => s.trim())
    const prices: Record<string, { price: number; currency: string; timestamp: string }> = {}

    for (const symbol of symbolArray) {
      const price = getMockPrice(symbol)
      prices[symbol] = {
        price,
        currency: "INR",
        timestamp: new Date().toISOString(),
      }
    }

    return NextResponse.json({ prices })
  } catch (error) {
    console.error("Error fetching prices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, price, source = "manual" } = body

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }

    const asset = await prisma.asset.findFirst({
      where: { userId: session.user.id, symbol },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const priceValue = price || getMockPrice(symbol)

    await prisma.priceHistory.create({
      data: {
        assetId: asset.id,
        price: priceValue,
        currency: "INR",
        source,
      },
    })

    return NextResponse.json({
      symbol,
      price: priceValue,
      currency: "INR",
      timestamp: new Date().toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error("Error recording price:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}