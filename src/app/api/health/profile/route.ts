import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function optionalNumber(value: unknown, label: string): number | null | string {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) return `${label} must be a number`
  if (parsed < 0) return `${label} cannot be negative`
  return parsed
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const income = optionalNumber(body.monthlyIncome, "Monthly income")
    if (typeof income === "string") {
      return NextResponse.json({ error: income }, { status: 400 })
    }

    const expenses = optionalNumber(body.monthlyExpenses, "Monthly expenses")
    if (typeof expenses === "string") {
      return NextResponse.json({ error: expenses }, { status: 400 })
    }

    const age = optionalNumber(body.age, "Age")
    if (typeof age === "string") {
      return NextResponse.json({ error: age }, { status: 400 })
    }
    if (age !== null && (age < 15 || age > 100 || !Number.isInteger(age))) {
      return NextResponse.json(
        { error: "Age must be a whole number between 15 and 100" },
        { status: 400 }
      )
    }

    const profile = await prisma.financialProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        monthlyIncome: income,
        monthlyExpenses: expenses,
        age,
      },
      update: {
        monthlyIncome: income,
        monthlyExpenses: expenses,
        age,
      },
      select: { monthlyIncome: true, monthlyExpenses: true, age: true },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Error saving financial profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
