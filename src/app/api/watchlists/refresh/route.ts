import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { refreshWatchlistQuotes } from "@/lib/watchlist-data"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const watchlistId = typeof body?.watchlistId === "string" ? body.watchlistId : undefined

    const result = await refreshWatchlistQuotes(session.user.id, watchlistId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error refreshing watchlist quotes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
