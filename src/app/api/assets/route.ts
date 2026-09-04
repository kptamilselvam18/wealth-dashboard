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

    const assets = await prisma.asset.findMany({
      where: { userId: session.user.id },
      include: {
        assetType: true,
        holdings: {
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error("Error fetching assets:", error)
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
    const { assetType, name, symbol, quantity, price, date, notes } = body

    // Find or create asset type
    let assetTypeRecord = await prisma.assetType.findUnique({
      where: { name: assetType },
    })

    if (!assetTypeRecord) {
      assetTypeRecord = await prisma.assetType.create({
        data: {
          name: assetType,
          displayName: assetType.replace("-", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        },
      })
    }

    // Create or find asset
    let asset = await prisma.asset.findFirst({
      where: {
        userId: session.user.id,
        name: name,
        assetTypeId: assetTypeRecord.id,
      },
    })

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          userId: session.user.id,
          assetTypeId: assetTypeRecord.id,
          name,
          symbol: symbol || null,
        },
      })
    }

    // Create holding
    const holding = await prisma.holding.create({
      data: {
        userId: session.user.id,
        assetId: asset.id,
        quantity,
        averagePrice: price,
      },
    })

    // Create buy transaction
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        assetId: asset.id,
        holdingId: holding.id,
        type: "BUY",
        quantity,
        price,
        totalAmount: quantity * price,
        date: new Date(date),
        notes,
      },
    })

    // Create price history entry
    await prisma.priceHistory.create({
      data: {
        assetId: asset.id,
        price,
        date: new Date(date),
        source: "manual",
      },
    })

    return NextResponse.json({ asset, holding }, { status: 201 })
  } catch (error) {
    console.error("Error creating asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, symbol, quantity, averagePrice } = body

    const holding = await prisma.holding.update({
      where: { id },
      data: {
        quantity,
        averagePrice,
      },
    })

    return NextResponse.json(holding)
  } catch (error) {
    console.error("Error updating holding:", error)
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

    await prisma.holding.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting holding:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}