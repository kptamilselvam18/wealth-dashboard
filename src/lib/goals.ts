import { goalPlan } from "@/lib/finance"

export const GOAL_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "ABANDONED"] as const
export type GoalStatusValue = (typeof GOAL_STATUSES)[number]

/** Assumed annual return used only to illustrate the monthly contribution needed. */
export const GOAL_RETURN_ASSUMPTION = 10

export interface GoalRecord {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface GoalView extends GoalRecord {
  progressPercent: number
  remaining: number
  monthsRemaining: number
  requiredMonthly: number
  onTrack: boolean
  returnAssumption: number
}

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

/** Deterministic progress view for a goal, including the monthly amount still needed. */
export function toGoalView(goal: GoalRecord, now: Date = new Date()): GoalView {
  const target = Math.max(0, goal.targetAmount)
  const current = Math.max(0, goal.currentAmount)
  const targetDate = new Date(goal.targetDate)
  const monthsRemaining = Number.isNaN(targetDate.getTime())
    ? 0
    : Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / MS_PER_MONTH))
  const remaining = Math.max(0, target - current)
  const progressPercent =
    target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0

  let requiredMonthly = 0
  if (remaining > 0) {
    requiredMonthly =
      monthsRemaining > 0
        ? goalPlan({
            target,
            current,
            annualReturn: GOAL_RETURN_ASSUMPTION,
            years: monthsRemaining / 12,
          }).monthlyRequired
        : remaining
  }

  const contribution = goal.monthlyContribution ?? 0
  const roundedRequired = Math.ceil(requiredMonthly)
  const onTrack =
    remaining === 0 ? true : roundedRequired > 0 && contribution >= roundedRequired

  return {
    ...goal,
    progressPercent,
    remaining,
    monthsRemaining,
    requiredMonthly: roundedRequired,
    onTrack,
    returnAssumption: GOAL_RETURN_ASSUMPTION,
  }
}

const goalDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

/**
 * Target dates are date-only values stored at UTC midnight, so they must be
 * formatted in UTC or they display a day earlier in western timezones.
 */
export function formatGoalDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "—" : goalDateFormatter.format(date)
}

export function goalStatusLabel(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "Completed"
    case "ABANDONED":
      return "Archived"
    case "PENDING":
      return "Not started"
    default:
      return "In progress"
  }
}
