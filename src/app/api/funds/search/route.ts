import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { searchMutualFunds } from "@/lib/market-data/mf-search"

export const dynamic = "force-dynamic"

/** Name → MFAPI scheme code lookup for the add-investment form. */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""
    if (query.length < 2) {
      return NextResponse.json({ error: "Enter at least 2 characters" }, { status: 400 })
    }

    const results = await searchMutualFunds(query)
    if (results === null) {
      return NextResponse.json(
        { error: "Fund search is unavailable right now. Enter the scheme code manually." },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "private, max-age=3600" } }
    )
  } catch (error) {
    console.error("Error searching funds:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
