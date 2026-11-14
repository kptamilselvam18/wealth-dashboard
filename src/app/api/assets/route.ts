import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recordSnapshot } from "@/lib/portfolio"
import type { AssetOption } from "@/lib/summary-types"

const CASH_TYPE = "cash"

function displayNameFor(name: string): string {
  if (name === CASH_TYPE) return "Cash"
  return name
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const assets = await prisma.asset.findMany({
      where: { userId: session.user.id },
      include: {
        assetType: true,
        holdings: { orderBy: { createdAt: "asc" } },
        priceHistory: { orderBy: { date: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    })

    const options: AssetOption[] = assets.map((asset) => {
      const holding = asset.holdings[0]
      const currentPrice = asset.priceHistory[0]?.price ?? holding?.averagePrice ?? 0
      return {
        id: asset.id,
        name: asset.name,
        symbol: asset.symbol,
        type: asset.assetType.name,
        typeName: asset.assetType.displayName,
        quantity: holding?.quantity ?? 0,
        averagePrice: holding?.averagePrice ?? 0,
        currentPrice,
        currentValue: (holding?.quantity ?? 0) * currentPrice,
      }
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const userId = session.user.id

    const body = await request.json().catch(() => null)
    const assetType = typeof body?.assetType === "string" ? body.assetType.trim() : ""
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const symbol =
      typeof body?.symbol === "string" && body.symbol.trim()
        ? body.symbol.trim().toUpperCase()
        : null
    const quantity = Number(body?.quantity)
    const price = Number(body?.price)
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null
    const date = body?.date ? new Date(body.date) : new Date()

    const isCash = assetType === CASH_TYPE
    const unitPrice = isCash ? 1 : price

    if (!assetType || !name) {
      return NextResponse.json(
        { error: "Asset type and name are required" },
        { status: 400 }
      )
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 })
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 })
    }

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid purchase date" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      let type = await tx.assetType.findUnique({ where: { name: assetType } })
      if (!type) {
        type = await tx.assetType.create({
          data: { name: assetType, displayName: displayNameFor(assetType) },
        })
      }

      let asset = await tx.asset.findFirst({
        where: { userId, name, assetTypeId: type.id },
      })
      if (!asset) {
        asset = await tx.asset.create({
          data: { userId, assetTypeId: type.id, name, symbol },
        })
      }

      const existingHolding = await tx.holding.findFirst({
        where: { userId, assetId: asset.id },
      })

      let holding
      if (existingHolding) {
        const newQuantity = existingHolding.quantity + quantity
        const newAveragePrice =
          (existingHolding.quantity * existingHolding.averagePrice + quantity * unitPrice) /
          newQuantity
        holding = await tx.holding.update({
          where: { id: existingHolding.id },
          data: { quantity: newQuantity, averagePrice: newAveragePrice },
        })
      } else {
        holding = await tx.holding.create({
          data: { userId, assetId: asset.id, quantity, averagePrice: unitPrice },
        })
      }

      await tx.transaction.create({
        data: {
          userId,
          assetId: asset.id,
          holdingId: holding.id,
          type: isCash ? "DEPOSIT" : "BUY",
          quantity,
          price: unitPrice,
          totalAmount: quantity * unitPrice,
          date,
          notes: notes || (isCash ? "Cash balance added" : "Investment added"),
        },
      })

      await tx.priceHistory.create({
        data: { assetId: asset.id, price: unitPrice, date, source: "manual" },
      })

      return { asset, holding }
    })

    await recordSnapshot(userId)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await request.json().catch(() => null)
    const id = typeof body?.id === "string" ? body.id : ""
    const quantity = Number(body?.quantity)
    const averagePrice = Number(body?.averagePrice)

    if (!id) {
      return NextResponse.json({ error: "Holding id is required" }, { status: 400 })
    }

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(averagePrice) || averagePrice < 0) {
      return NextResponse.json({ error: "Invalid quantity or average price" }, { status: 400 })
    }

    const holding = await prisma.holding.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 })
    }

    const updated = await prisma.holding.update({
      where: { id: holding.id },
      data: { quantity, averagePrice },
    })

    await recordSnapshot(session.user.id)

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating holding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Holding id is required" }, { status: 400 })
    }

    const holding = await prisma.holding.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!holding) {
      return NextResponse.json({ error: "Holding not found" }, { status: 404 })
    }

    await prisma.holding.delete({ where: { id: holding.id } })
    await recordSnapshot(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting holding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
