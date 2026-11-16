import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getQuotes } from "@/lib/market-data"
import { isFundType, quoteRequestFor } from "@/lib/portfolio-pricing"

/**
 * Live quote lookup by symbol. Returns unavailable symbols explicitly instead of
 * inventing a price. `assetType=mutual-fund` resolves numeric MFAPI scheme codes.
 */
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

    const assetType = searchParams.get("assetType")?.trim() || "stock"
    const list = symbols
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 50)

    if (list.length === 0) {
      return NextResponse.json({ error: "No valid symbols supplied" }, { status: 400 })
    }

    const { quotes, unavailable, provider } = await getQuotes(
      list.map((symbol) => quoteRequestFor(symbol, assetType))
    )

    const prices: Record<
      string,
      {
        price: number
        previousClose: number | null
        currency: string
        source: string
        timestamp: string
        stale: boolean
      }
    > = {}

    for (const symbol of list) {
      const quote = quotes.get(symbol)
      if (!quote) continue
      prices[symbol] = {
        price: quote.price,
        previousClose: quote.previousClose,
        currency: quote.currency,
        source: quote.source,
        timestamp: quote.asOf,
        stale: quote.stale,
      }
    }

    return NextResponse.json(
      { prices, unavailable, provider, assetType: isFundType(assetType) ? "mutual-fund" : assetType },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Error fetching prices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** Record a manual price for one of the user's assets. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const symbol = typeof body?.symbol === "string" ? body.symbol.trim().toUpperCase() : ""
    const price = Number(body?.price)

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 })
    }

    const asset = await prisma.asset.findFirst({
      where: { userId: session.user.id, symbol },
    })
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    await prisma.priceHistory.create({
      data: {
        assetId: asset.id,
        price,
        currency: "INR",
        source: "manual",
      },
    })

    return NextResponse.json(
      {
        symbol,
        price,
        currency: "INR",
        source: "manual",
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error recording price:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
