import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { demoQuote } from "@/lib/watchlists"
import { initialFlags, setManualPrice, toItemView } from "@/lib/watchlist-data"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function optionalThreshold(value: unknown, label: string): number | null | string {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return `${label} must be greater than 0`
  return parsed
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const watchlistId = typeof body.watchlistId === "string" ? body.watchlistId : ""
    const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const exchange = typeof body.exchange === "string" && body.exchange.trim() ? body.exchange.trim().toUpperCase() : null
    const assetType = typeof body.assetType === "string" && body.assetType.trim() ? body.assetType.trim() : "stock"

    if (!watchlistId) {
      return NextResponse.json({ error: "Choose a watchlist" }, { status: 400 })
    }
    if (!symbol || symbol.length > 24) {
      return NextResponse.json({ error: "Enter a symbol of up to 24 characters" }, { status: 400 })
    }
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Enter a name of up to 80 characters" }, { status: 400 })
    }

    const alertAbove = optionalThreshold(body.alertAbove, "Upper price alert")
    const alertBelow = optionalThreshold(body.alertBelow, "Lower price alert")
    const alertChangePercent = optionalThreshold(body.alertChangePercent, "Change alert")
    if (typeof alertAbove === "string") return NextResponse.json({ error: alertAbove }, { status: 400 })
    if (typeof alertBelow === "string") return NextResponse.json({ error: alertBelow }, { status: 400 })
    if (typeof alertChangePercent === "string") {
      return NextResponse.json({ error: alertChangePercent }, { status: 400 })
    }
    if (alertChangePercent !== null && alertChangePercent > 100) {
      return NextResponse.json({ error: "Change alert must be 100% or less" }, { status: 400 })
    }
    if (alertAbove !== null && alertBelow !== null && alertAbove <= alertBelow) {
      return NextResponse.json(
        { error: "The upper price alert must be above the lower price alert" },
        { status: 400 }
      )
    }

    const watchlist = await prisma.watchlist.findFirst({
      where: { id: watchlistId, userId: session.user.id },
    })
    if (!watchlist) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 })
    }

    const duplicate = await prisma.watchlistItem.findFirst({
      where: { watchlistId, symbol },
    })
    if (duplicate) {
      return NextResponse.json({ error: `${symbol} is already in this watchlist` }, { status: 400 })
    }

    const quote = demoQuote(symbol)
    const flags = initialFlags(
      { alertAbove, alertBelow, alertChangePercent },
      quote.price,
      quote.previousPrice
    )

    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId,
        symbol,
        name,
        exchange,
        assetType,
        price: quote.price,
        previousPrice: quote.previousPrice,
        priceSource: "demo",
        priceUpdatedAt: new Date(),
        alertAbove,
        alertBelow,
        alertChangePercent,
        ...flags,
      },
    })

    await prisma.watchlist.update({
      where: { id: watchlistId },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ item: toItemView(item) }, { status: 201 })
  } catch (error) {
    console.error("Error adding watchlist item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const id = typeof body.id === "string" ? body.id : ""
    if (!id) return NextResponse.json({ error: "Item id is required" }, { status: 400 })

    const item = await prisma.watchlistItem.findFirst({
      where: { id, watchlist: { userId: session.user.id } },
    })
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    if (body.manualPrice !== undefined) {
      const price = Number(body.manualPrice)
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: "Price must be greater than 0" }, { status: 400 })
      }
      const { triggered } = await setManualPrice(session.user.id, id, price)
      const updated = await prisma.watchlistItem.findUnique({ where: { id } })
      return NextResponse.json({ item: updated ? toItemView(updated) : null, triggered })
    }

    const data: {
      name?: string
      exchange?: string | null
      assetType?: string
      alertAbove?: number | null
      alertBelow?: number | null
      alertChangePercent?: number | null
    } = {}

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name || name.length > 80) {
        return NextResponse.json({ error: "Enter a name of up to 80 characters" }, { status: 400 })
      }
      data.name = name
    }
    if (body.exchange !== undefined) {
      data.exchange =
        typeof body.exchange === "string" && body.exchange.trim()
          ? body.exchange.trim().toUpperCase()
          : null
    }
    if (body.assetType !== undefined) {
      if (typeof body.assetType !== "string" || !body.assetType.trim()) {
        return NextResponse.json({ error: "Invalid asset type" }, { status: 400 })
      }
      data.assetType = body.assetType.trim()
    }

    const alertAbove =
      body.alertAbove === undefined ? item.alertAbove : optionalThreshold(body.alertAbove, "Upper price alert")
    const alertBelow =
      body.alertBelow === undefined ? item.alertBelow : optionalThreshold(body.alertBelow, "Lower price alert")
    const alertChangePercent =
      body.alertChangePercent === undefined
        ? item.alertChangePercent
        : optionalThreshold(body.alertChangePercent, "Change alert")

    if (typeof alertAbove === "string") return NextResponse.json({ error: alertAbove }, { status: 400 })
    if (typeof alertBelow === "string") return NextResponse.json({ error: alertBelow }, { status: 400 })
    if (typeof alertChangePercent === "string") {
      return NextResponse.json({ error: alertChangePercent }, { status: 400 })
    }
    if (alertAbove !== null && alertBelow !== null && alertAbove <= alertBelow) {
      return NextResponse.json(
        { error: "The upper price alert must be above the lower price alert" },
        { status: 400 }
      )
    }

    if (body.alertAbove !== undefined) data.alertAbove = alertAbove
    if (body.alertBelow !== undefined) data.alertBelow = alertBelow
    if (body.alertChangePercent !== undefined) data.alertChangePercent = alertChangePercent

    const flags = initialFlags(
      { alertAbove, alertBelow, alertChangePercent },
      item.price,
      item.previousPrice
    )

    const updated = await prisma.watchlistItem.update({
      where: { id },
      data: { ...data, ...flags },
    })

    return NextResponse.json({ item: toItemView(updated) })
  } catch (error) {
    console.error("Error updating watchlist item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Item id is required" }, { status: 400 })

    const item = await prisma.watchlistItem.findFirst({
      where: { id, watchlist: { userId: session.user.id } },
    })
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    await prisma.watchlistItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting watchlist item:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
