import { NextRequest, NextResponse } from "next/server"
import { Prisma, TransactionType } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recordSnapshot } from "@/lib/portfolio"

const TRANSACTION_TYPES = Object.values(TransactionType)
const CASH_TYPE = "cash"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function parseType(value: unknown): TransactionType | null {
  if (typeof value !== "string") return null
  const normalized = value.toUpperCase()
  return TRANSACTION_TYPES.includes(normalized as TransactionType)
    ? (normalized as TransactionType)
    : null
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get("assetId")
    const type = parseType(searchParams.get("type"))
    const limit = Number(searchParams.get("limit"))

    const where: Prisma.TransactionWhereInput = { userId: session.user.id }
    if (assetId) where.assetId = assetId
    if (type) where.type = type

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        asset: { select: { name: true, symbol: true, assetType: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
      take: Number.isFinite(limit) && limit > 0 ? limit : 200,
    })

    return NextResponse.json(
      transactions.map((transaction) => ({
        id: transaction.id,
        assetId: transaction.assetId,
        type: transaction.type,
        name: transaction.asset.name,
        symbol: transaction.asset.symbol,
        assetType: transaction.asset.assetType.name,
        quantity: transaction.quantity,
        price: transaction.price,
        totalAmount: transaction.totalAmount,
        fee: transaction.fee,
        date: transaction.date.toISOString(),
        notes: transaction.notes,
      }))
    )
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const userId = session.user.id

    const body = await request.json().catch(() => null)
    const assetId = typeof body?.assetId === "string" ? body.assetId : ""
    const type = parseType(body?.type)
    const quantity = body?.quantity === undefined ? 0 : Number(body.quantity)
    const price = body?.price === undefined ? 0 : Number(body.price)
    const fee = body?.fee ? Number(body.fee) : 0
    const date = body?.date ? new Date(body.date) : new Date()
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null

    if (!assetId || !type) {
      return NextResponse.json(
        { error: "Asset and transaction type are required" },
        { status: 400 }
      )
    }

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid transaction date" }, { status: 400 })
    }

    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0 || !Number.isFinite(fee) || fee < 0) {
      return NextResponse.json({ error: "Quantity, price and fee must be valid numbers" }, { status: 400 })
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId },
      include: { assetType: true },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const isCash = asset.assetType.name === CASH_TYPE
    const holding = await prisma.holding.findFirst({ where: { userId, assetId } })

    const totalAmount =
      type === "DIVIDEND" || type === "INTEREST"
        ? price > 0 && quantity > 0
          ? quantity * price
          : price || Number(body?.totalAmount) || 0
        : quantity * price

    if (!isCash && (type === "BUY" || type === "SELL" || type === "SIP") && (quantity <= 0 || price < 0)) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0 for this transaction type" },
        { status: 400 }
      )
    }

    if (type === "SELL" && !isCash && (!holding || holding.quantity < quantity)) {
      return NextResponse.json(
        { error: "You cannot sell more than you currently hold" },
        { status: 400 }
      )
    }

    if ((type === "DEPOSIT" || type === "WITHDRAWAL") && !isCash) {
      return NextResponse.json(
        { error: "Deposits and withdrawals can only be recorded against a cash asset" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      let activeHolding = holding

      if (isCash) {
        if (type === "DEPOSIT" || type === "WITHDRAWAL") {
          const delta = type === "DEPOSIT" ? totalAmount : -totalAmount
          if (!activeHolding) {
            activeHolding = await tx.holding.create({
              data: { userId, assetId, quantity: Math.max(delta, 0), averagePrice: 1 },
            })
          } else {
            const newQuantity = Math.max(activeHolding.quantity + delta, 0)
            activeHolding = await tx.holding.update({
              where: { id: activeHolding.id },
              data: { quantity: newQuantity },
            })
          }
        }
      } else if (type === "BUY" || type === "SIP") {
        if (!activeHolding) {
          activeHolding = await tx.holding.create({
            data: { userId, assetId, quantity, averagePrice: price },
          })
        } else {
          const newQuantity = activeHolding.quantity + quantity
          const newAveragePrice =
            (activeHolding.quantity * activeHolding.averagePrice + quantity * price) / newQuantity
          activeHolding = await tx.holding.update({
            where: { id: activeHolding.id },
            data: { quantity: newQuantity, averagePrice: newAveragePrice },
          })
        }
      } else if (type === "SELL" && activeHolding) {
        const newQuantity = activeHolding.quantity - quantity
        if (newQuantity <= 0) {
          await tx.holding.delete({ where: { id: activeHolding.id } })
          activeHolding = null
        } else {
          activeHolding = await tx.holding.update({
            where: { id: activeHolding.id },
            data: { quantity: newQuantity },
          })
        }
      }

      const transaction = await tx.transaction.create({
        data: {
          userId,
          assetId,
          holdingId: activeHolding?.id ?? null,
          type,
          quantity,
          price,
          totalAmount,
          fee: fee || 0,
          date,
          notes,
        },
      })

      if (!isCash && price > 0) {
        await tx.priceHistory.create({
          data: { assetId, price, date, source: "manual" },
        })
      }

      return transaction
    })

    await recordSnapshot(userId)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Transaction id is required" }, { status: 400 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { asset: { include: { assetType: true } } },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const isCash = transaction.asset.assetType.name === CASH_TYPE

    await prisma.$transaction(async (tx) => {
      const holding = await tx.holding.findFirst({
        where: { userId, assetId: transaction.assetId },
      })

      if (holding) {
        if (isCash) {
          const delta =
            transaction.type === "DEPOSIT"
              ? -transaction.totalAmount
              : transaction.type === "WITHDRAWAL"
                ? transaction.totalAmount
                : 0
          if (delta !== 0) {
            const newQuantity = Math.max(holding.quantity + delta, 0)
            if (newQuantity === 0) {
              await tx.holding.delete({ where: { id: holding.id } })
            } else {
              await tx.holding.update({
                where: { id: holding.id },
                data: { quantity: newQuantity },
              })
            }
          }
        } else if (transaction.type === "BUY" || transaction.type === "SIP") {
          const newQuantity = holding.quantity - transaction.quantity
          if (newQuantity <= 0.000001) {
            await tx.holding.delete({ where: { id: holding.id } })
          } else {
            await tx.holding.update({
              where: { id: holding.id },
              data: { quantity: newQuantity },
            })
          }
        } else if (transaction.type === "SELL") {
          await tx.holding.update({
            where: { id: holding.id },
            data: { quantity: holding.quantity + transaction.quantity },
          })
        }
      }

      await tx.transaction.delete({ where: { id: transaction.id } })
    })

    await recordSnapshot(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
