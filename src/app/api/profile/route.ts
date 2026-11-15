import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, emailAlerts: true },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Error loading profile:", error)
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
    const name = typeof body?.name === "string" ? body.name.trim() : undefined
    const emailAlerts =
      typeof body?.emailAlerts === "boolean" ? body.emailAlerts : undefined

    if (name === undefined && emailAlerts === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }
    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(emailAlerts !== undefined ? { emailAlerts } : {}),
      },
      select: { id: true, name: true, email: true, emailAlerts: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.delete({ where: { id: session.user.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
