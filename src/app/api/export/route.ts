import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPortfolioSummary } from "@/lib/portfolio"
import { toCsv } from "@/lib/csv"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const kind = request.nextUrl.searchParams.get("type")
  if (kind !== "holdings" && kind !== "transactions") return NextResponse.json({ error: "Choose holdings or transactions" }, { status: 400 })
  try {
    let rows: unknown[][]
    if (kind === "holdings") {
      const summary = await getPortfolioSummary(session.user.id)
      rows = [["Asset", "Symbol", "Type", "Quantity", "Average price INR", "Current price INR", "Invested INR", "Current value INR", "Profit/loss INR", "Return %", "Price source", "Price date"], ...summary.holdings.map(h => [h.name, h.symbol, h.type, h.quantity, h.averagePrice, h.currentPrice, h.invested, h.currentValue, h.pnl, h.returnPercent, h.priceSource, h.priceAsOf])]
    } else {
      const transactions = await prisma.transaction.findMany({ where: { userId: session.user.id }, include: { asset: true }, orderBy: [{ date: "desc" }, { id: "desc" }] })
      rows = [["Date", "Type", "Asset", "Symbol", "Quantity", "Price INR", "Amount INR", "Fee INR", "Notes"], ...transactions.map(t => [t.date.toISOString(), t.type, t.asset.name, t.asset.symbol, t.quantity, t.price, t.totalAmount, t.fee, t.notes])]
    }
    return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="wealth-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } })
  } catch { return NextResponse.json({ error: "Could not prepare your export. Please try again." }, { status: 500 }) }
}
