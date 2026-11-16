import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { refreshPortfolioPrices } from "@/lib/portfolio-pricing"

export const maxDuration = 60

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await refreshPortfolioPrices(session.user.id)
    return NextResponse.json(
      { ...result, refreshedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Error refreshing portfolio prices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
