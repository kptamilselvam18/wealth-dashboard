import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { listWatchlists } from "@/lib/watchlist-data"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const data = await listWatchlists(session.user.id)
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Error loading watchlists:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await request.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name.trim() : ""

    if (!name || name.length > 60) {
      return NextResponse.json(
        { error: "Give the watchlist a name of up to 60 characters" },
        { status: 400 }
      )
    }

    const existing = await prisma.watchlist.count({ where: { userId: session.user.id } })
    if (existing >= 10) {
      return NextResponse.json(
        { error: "You can keep up to 10 watchlists. Delete one first." },
        { status: 400 }
      )
    }

    const watchlist = await prisma.watchlist.create({
      data: { userId: session.user.id, name },
      include: { items: true },
    })

    return NextResponse.json(
      { watchlist: { id: watchlist.id, name: watchlist.name, items: [] } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating watchlist:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Watchlist id is required" }, { status: 400 })

    const watchlist = await prisma.watchlist.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!watchlist) {
      return NextResponse.json({ error: "Watchlist not found" }, { status: 404 })
    }

    await prisma.watchlist.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting watchlist:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
