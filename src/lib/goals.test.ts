import { describe, expect, it } from "vitest"
import { formatGoalDate, toGoalView, type GoalRecord } from "./goals"

const now = new Date("2026-01-01T00:00:00.000Z")

function goal(overrides: Partial<GoalRecord> = {}): GoalRecord {
  return {
    id: "goal_1",
    name: "Emergency fund",
    targetAmount: 600000,
    currentAmount: 150000,
    targetDate: "2027-01-01T00:00:00.000Z",
    monthlyContribution: 10000,
    status: "IN_PROGRESS",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("goal dates", () => {
  it("formats date-only targets without shifting the day", () => {
    expect(formatGoalDate("2029-01-01T00:00:00.000Z")).toBe("1 Jan 2029")
    expect(formatGoalDate("2026-08-15T00:00:00.000Z")).toContain("15 Aug 2026")
    expect(formatGoalDate("not-a-date")).toBe("—")
  })
})

describe("goal progress", () => {
  it("computes funded percentage and remaining amount", () => {
    const view = toGoalView(goal(), now)
    expect(view.progressPercent).toBe(25)
    expect(view.remaining).toBe(450000)
    expect(view.monthsRemaining).toBe(12)
  })

  it("requires a monthly contribution for the remaining amount", () => {
    const view = toGoalView(goal({ currentAmount: 0 }), now)
    expect(view.requiredMonthly).toBeGreaterThan(0)
    expect(view.onTrack).toBe(false)
  })

  it("shows a lower required contribution when more time remains", () => {
    const oneYear = toGoalView(goal({ currentAmount: 0 }), now)
    const fiveYears = toGoalView(
      goal({ currentAmount: 0, targetDate: "2031-01-01T00:00:00.000Z" }),
      now
    )
    expect(fiveYears.requiredMonthly).toBeLessThan(oneYear.requiredMonthly)
    expect(fiveYears.monthsRemaining).toBe(60)
  })

  it("marks a goal on track when contributions cover the requirement", () => {
    const view = toGoalView(goal(), now)
    const funded = toGoalView(goal({ monthlyContribution: view.requiredMonthly }), now)
    expect(funded.onTrack).toBe(true)
  })

  it("caps progress and requires nothing once a goal is funded", () => {
    const view = toGoalView(goal({ currentAmount: 700000, monthlyContribution: 0 }), now)
    expect(view.progressPercent).toBe(100)
    expect(view.remaining).toBe(0)
    expect(view.requiredMonthly).toBe(0)
    expect(view.onTrack).toBe(true)
  })

  it("asks for the full remaining amount when the target date has passed", () => {
    const view = toGoalView(goal({ targetDate: "2025-01-01T00:00:00.000Z" }), now)
    expect(view.monthsRemaining).toBe(0)
    expect(view.requiredMonthly).toBe(450000)
    expect(view.onTrack).toBe(false)
  })

  it("handles a target date far in the future without dividing by zero", () => {
    const view = toGoalView(goal({ targetAmount: 0, currentAmount: 0 }), now)
    expect(view.progressPercent).toBe(0)
    expect(view.requiredMonthly).toBe(0)
    expect(Number.isFinite(view.requiredMonthly)).toBe(true)
  })

  it("ignores negative stored amounts instead of producing a negative requirement", () => {
    const view = toGoalView(goal({ currentAmount: -500 }), now)
    expect(view.remaining).toBe(600000)
    expect(view.progressPercent).toBe(0)
    expect(view.requiredMonthly).toBeGreaterThan(0)
  })
})
