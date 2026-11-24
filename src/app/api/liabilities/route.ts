import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseLiability } from "@/lib/liabilities"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    return NextResponse.json(await prisma.liability.findMany({ where: { userId: session.user.id }, orderBy: { outstandingAmount: "desc" } }), { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ error: "Could not load debts" }, { status: 500 }) }
}

async function save(request: NextRequest, editing: boolean) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  let data
  try { data = parseLiability(body) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) }
  try {
    if (editing) {
      if (typeof body.id !== "string") return NextResponse.json({ error: "Debt id required" }, { status: 400 })
      const result = await prisma.liability.updateMany({ where: { id: body.id, userId: session.user.id }, data })
      if (!result.count) return NextResponse.json({ error: "Debt not found" }, { status: 404 })
      return NextResponse.json({ success: true })
    }
    return NextResponse.json(await prisma.liability.create({ data: { ...data, userId: session.user.id } }), { status: 201 })
  } catch { return NextResponse.json({ error: "Could not save debt" }, { status: 500 }) }
}
export const POST = (request: NextRequest) => save(request, false)
export const PATCH = (request: NextRequest) => save(request, true)
export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Debt id required" }, { status: 400 })
  try {
    const result = await prisma.liability.deleteMany({ where: { id, userId: session.user.id } })
    return NextResponse.json({ success: Boolean(result.count) }, { status: result.count ? 200 : 404 })
  } catch { return NextResponse.json({ error: "Could not delete debt" }, { status: 500 }) }
}
