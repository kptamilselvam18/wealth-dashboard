import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get("assetId")
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {
      userId: session.user.id,
    }

    if (assetId) {
      where.assetId = assetId
    }

    if (type) {
      where.type = type
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        asset: {
          select: { name: true, symbol: true },
        },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
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
    const { assetId, type, quantity, price, fee, date, notes } = body

    if (!assetId || !type || !quantity || !price || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify asset belongs to user
    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        userId: session.user.id,
      },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Get current holding
    const holding = await prisma.holding.findFirst({
      where: { assetId: asset.id },
    })

    // Calculate total amount including fee
    const totalAmount = parseFloat(price) * parseFloat(quantity) + parseFloat(fee || 0)

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        assetId: asset.id,
        holdingId: holding?.id || null,
        type: type,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        totalAmount,
        fee: parseFloat(fee || 0),
        date: new Date(date),
        notes,
      },
    })

    // Update holding based on transaction type
    if (type === "BUY") {
      if (holding) {
        const totalCost = (holding.quantity * holding.averagePrice) + (parseFloat(quantity) * parseFloat(price))
        const newQuantity = holding.quantity + parseFloat(quantity)
        const newAveragePrice = totalCost / newQuantity
        await prisma.holding.update({
          where: { id: holding.id },
          data: {
            quantity: newQuantity,
            averagePrice: newAveragePrice,
          },
        })
      } else {
        await prisma.holding.create({
          data: {
            userId: session.user.id,
            assetId: asset.id,
            quantity: parseFloat(quantity),
            averagePrice: parseFloat(price),
          },
        })
      }
    } else if (type === "SELL") {
      if (holding) {
        const newQuantity = holding.quantity - parseFloat(quantity)
        if (newQuantity <= 0) {
          await prisma.holding.delete({ where: { id: holding.id } })
        } else {
          await prisma.holding.update({
            where: { id: holding.id },
            data: {
              quantity: newQuantity,
            },
          })
        }
      }
    }

    // Create price history entry
    await prisma.priceHistory.create({
      data: {
        assetId: asset.id,
        price: parseFloat(price),
        date: new Date(date),
        source: "manual",
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await prisma.transaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}