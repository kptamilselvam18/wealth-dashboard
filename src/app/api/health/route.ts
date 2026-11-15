import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getFinancialHealth, saveHealthCheckIn } from "@/lib/health/data"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await getFinancialHealth(session.user.id)
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Error computing financial health:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const snapshot = await saveHealthCheckIn(session.user.id)
    return NextResponse.json({ snapshot }, { status: 201 })
  } catch (error) {
    console.error("Error saving financial health check-in:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
