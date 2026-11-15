import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const events = await prisma.alertEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { item: { select: { symbol: true } } },
    })

    return NextResponse.json(
      {
        events: events.map((event) => ({
          id: event.id,
          type: event.type,
          message: event.message,
          price: event.price,
          threshold: event.threshold,
          symbol: event.item.symbol,
          createdAt: event.createdAt.toISOString(),
          readAt: event.readAt?.toISOString() ?? null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Error loading alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const id = typeof body?.id === "string" ? body.id : null

    if (id) {
      const event = await prisma.alertEvent.findFirst({
        where: { id, userId: session.user.id },
      })
      if (!event) {
        return NextResponse.json({ error: "Alert not found" }, { status: 404 })
      }
      await prisma.alertEvent.update({ where: { id }, data: { readAt: new Date() } })
      return NextResponse.json({ success: true })
    }

    await prisma.alertEvent.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
