import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { GOAL_STATUSES, toGoalView, type GoalRecord, type GoalStatusValue } from "@/lib/goals"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function serialize(goal: {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: Date
  monthlyContribution: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}): GoalRecord {
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: goal.targetDate.toISOString(),
    monthlyContribution: goal.monthlyContribution,
    status: goal.status,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  }
}

function isStatus(value: unknown): value is GoalStatusValue {
  return typeof value === "string" && (GOAL_STATUSES as readonly string[]).includes(value)
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      orderBy: [{ status: "asc" }, { targetDate: "asc" }],
    })

    return NextResponse.json(
      { goals: goals.map((goal) => toGoalView(serialize(goal))) },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Error loading goals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const name = typeof body.name === "string" ? body.name.trim() : ""
    const targetAmount = Number(body.targetAmount)
    const currentAmount = body.currentAmount === undefined ? 0 : Number(body.currentAmount)
    const monthlyContribution =
      body.monthlyContribution === undefined || body.monthlyContribution === null ||
      body.monthlyContribution === ""
        ? null
        : Number(body.monthlyContribution)
    const targetDate = new Date(body.targetDate)
    const status = body.status === undefined ? undefined : body.status

    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "Give the goal a name of up to 80 characters" },
        { status: 400 }
      )
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json({ error: "Target amount must be greater than 0" }, { status: 400 })
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      return NextResponse.json({ error: "Saved amount cannot be negative" }, { status: 400 })
    }
    if (monthlyContribution !== null && (!Number.isFinite(monthlyContribution) || monthlyContribution < 0)) {
      return NextResponse.json(
        { error: "Monthly contribution must be zero or more" },
        { status: 400 }
      )
    }
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Choose a valid target date" }, { status: 400 })
    }
    if (status !== undefined && !isStatus(status)) {
      return NextResponse.json({ error: "Invalid goal status" }, { status: 400 })
    }

    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        name,
        targetAmount,
        currentAmount,
        targetDate,
        monthlyContribution,
        status:
          status ?? (currentAmount >= targetAmount ? "COMPLETED" : "IN_PROGRESS"),
      },
    })

    return NextResponse.json({ goal: toGoalView(serialize(goal)) }, { status: 201 })
  } catch (error) {
    console.error("Error creating goal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const id = typeof body.id === "string" ? body.id : ""
    if (!id) return NextResponse.json({ error: "Goal id is required" }, { status: 400 })

    const existing = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const data: {
      name?: string
      targetAmount?: number
      currentAmount?: number
      targetDate?: Date
      monthlyContribution?: number | null
      status?: GoalStatusValue
    } = {}

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name || name.length > 80) {
        return NextResponse.json(
          { error: "Give the goal a name of up to 80 characters" },
          { status: 400 }
        )
      }
      data.name = name
    }

    if (body.targetAmount !== undefined) {
      const targetAmount = Number(body.targetAmount)
      if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        return NextResponse.json(
          { error: "Target amount must be greater than 0" },
          { status: 400 }
        )
      }
      data.targetAmount = targetAmount
    }

    if (body.currentAmount !== undefined) {
      const currentAmount = Number(body.currentAmount)
      if (!Number.isFinite(currentAmount) || currentAmount < 0) {
        return NextResponse.json({ error: "Saved amount cannot be negative" }, { status: 400 })
      }
      data.currentAmount = currentAmount
    }

    if (body.targetDate !== undefined) {
      const targetDate = new Date(body.targetDate)
      if (Number.isNaN(targetDate.getTime())) {
        return NextResponse.json({ error: "Choose a valid target date" }, { status: 400 })
      }
      data.targetDate = targetDate
    }

    if (body.monthlyContribution !== undefined) {
      if (body.monthlyContribution === null || body.monthlyContribution === "") {
        data.monthlyContribution = null
      } else {
        const contribution = Number(body.monthlyContribution)
        if (!Number.isFinite(contribution) || contribution < 0) {
          return NextResponse.json(
            { error: "Monthly contribution must be zero or more" },
            { status: 400 }
          )
        }
        data.monthlyContribution = contribution
      }
    }

    if (body.status !== undefined) {
      if (!isStatus(body.status)) {
        return NextResponse.json({ error: "Invalid goal status" }, { status: 400 })
      }
      data.status = body.status
    }

    const goal = await prisma.goal.update({ where: { id }, data })
    return NextResponse.json({ goal: toGoalView(serialize(goal)) })
  } catch (error) {
    console.error("Error updating goal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Goal id is required" }, { status: 400 })

    const goal = await prisma.goal.findFirst({ where: { id, userId: session.user.id } })
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    await prisma.goal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting goal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
