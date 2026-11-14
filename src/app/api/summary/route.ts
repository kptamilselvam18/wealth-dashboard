import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getPortfolioSummary } from "@/lib/portfolio"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const summary = await getPortfolioSummary(session.user.id)
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("Error building portfolio summary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
