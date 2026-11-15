import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isCronAuthorized } from "@/lib/market-data/cron"
import { refreshWatchlistQuotes } from "@/lib/watchlist-data"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Scheduled alert evaluation. Vercel Cron calls this with
 * `Authorization: Bearer $CRON_SECRET`; nothing runs without the secret.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured, so scheduled evaluation is disabled" },
      { status: 503 }
    )
  }
  if (!isCronAuthorized(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await prisma.watchlist.findMany({
      where: {
        items: {
          some: {
            OR: [
              { alertAbove: { not: null } },
              { alertBelow: { not: null } },
              { alertChangePercent: { not: null } },
            ],
          },
        },
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 100,
    })

    let updated = 0
    let triggered = 0
    let unavailable = 0
    let failed = 0

    for (const { userId } of users) {
      try {
        const result = await refreshWatchlistQuotes(userId)
        updated += result.updated
        triggered += result.triggered
        unavailable += result.unavailable
      } catch (error) {
        failed += 1
        console.error("Scheduled alert evaluation failed for a user:", error)
      }
    }

    return NextResponse.json(
      {
        users: users.length,
        updated,
        triggered,
        unavailable,
        failed,
        evaluatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Scheduled alert evaluation failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
