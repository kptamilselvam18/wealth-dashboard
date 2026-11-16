import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isCronAuthorized } from "@/lib/market-data/cron"
import { refreshPortfolioPrices } from "@/lib/portfolio-pricing"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Daily portfolio valuation: refresh holding prices and append one snapshot per
 * user so the performance chart reflects real market values.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured, so scheduled valuation is disabled" },
      { status: 503 }
    )
  }
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await prisma.holding.findMany({
      select: { userId: true },
      distinct: ["userId"],
      take: 50,
    })

    let updated = 0
    let unavailable = 0
    let skipped = 0
    let failed = 0

    for (const { userId } of users) {
      try {
        const result = await refreshPortfolioPrices(userId)
        updated += result.updated
        unavailable += result.unavailable
        skipped += result.skipped
      } catch (error) {
        failed += 1
        console.error("Scheduled portfolio valuation failed for a user:", error)
      }
    }

    return NextResponse.json(
      {
        users: users.length,
        updated,
        unavailable,
        skipped,
        failed,
        evaluatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Scheduled portfolio valuation failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
