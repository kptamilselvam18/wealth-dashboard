"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarClock, Pencil, Plus, Target, Trash2, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageError, PageLoading } from "@/components/page-state"
import { GoalDialog } from "@/components/goals/goal-dialog"
import { formatCurrency } from "@/lib/format"
import { formatGoalDate, goalStatusLabel, type GoalView } from "@/lib/goals"
import { cn } from "@/lib/utils"

function statusClass(status: string): string {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
  if (status === "ABANDONED") return "bg-muted text-muted-foreground"
  if (status === "PENDING") return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
  return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalView[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GoalView | null>(null)
  const [contributions, setContributions] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/goals", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load your goals")
      const data = (await response.json()) as { goals: GoalView[] }
      setGoals(data.goals)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your goals")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => {
    const active = (goals ?? []).filter((goal) => goal.status !== "ABANDONED")
    const target = active.reduce((sum, goal) => sum + goal.targetAmount, 0)
    const saved = active.reduce((sum, goal) => sum + Math.min(goal.currentAmount, goal.targetAmount), 0)
    return {
      count: active.length,
      target,
      saved,
      progress: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
      onTrack: active.filter((goal) => goal.onTrack).length,
    }
  }, [goals])

  const openCreate = () => {
    setEditing(null)
    setNotice(null)
    setDialogOpen(true)
  }

  const openEdit = (goal: GoalView) => {
    setEditing(goal)
    setNotice(null)
    setDialogOpen(true)
  }

  const addContribution = async (goal: GoalView) => {
    const raw = contributions[goal.id] ?? ""
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Enter a contribution greater than 0")
      return
    }

    setBusyId(goal.id)
    setNotice(null)
    try {
      const response = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: goal.id,
          currentAmount: Math.min(goal.targetAmount, goal.currentAmount + amount),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not add this contribution")
      }
      setContributions((current) => ({ ...current, [goal.id]: "" }))
      await load()
    } catch (contributionError) {
      setNotice(
        contributionError instanceof Error
          ? contributionError.message
          : "Could not add this contribution"
      )
    } finally {
      setBusyId(null)
    }
  }

  const removeGoal = async (goal: GoalView) => {
    if (!window.confirm(`Delete "${goal.name}"? This cannot be undone.`)) return
    setBusyId(goal.id)
    setNotice(null)
    try {
      const response = await fetch(`/api/goals?id=${goal.id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not delete this goal")
      }
      await load()
    } catch (deleteError) {
      setNotice(deleteError instanceof Error ? deleteError.message : "Could not delete this goal")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageLoading label="Loading your goals..." />

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Target className="h-6 w-6 text-primary" /> Goals &amp; Planning
          </h1>
          <p className="text-muted-foreground">
            Track what you are saving for. Goals also feed your Financial Health score.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <PageError message={error} />
        </div>
      )}

      {notice && (
        <p className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm">{notice}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total target</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(summary.target)}</p>
            <p className="text-xs text-muted-foreground">
              {summary.count} active goal{summary.count === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saved so far</p>
            <p className="mt-1 text-2xl font-semibold">{formatCurrency(summary.saved)}</p>
            <p className="text-xs text-muted-foreground">
              {summary.progress.toFixed(1)}% of all targets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">On track</p>
            <p className="mt-1 text-2xl font-semibold">
              {summary.onTrack}/{summary.count}
            </p>
            <p className="text-xs text-muted-foreground">Contributions cover the requirement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Health factor
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {summary.count > 0 ? "Measured" : "Unknown"}
            </p>
            <Link href="/health" className="text-xs text-primary hover:underline">
              View your Financial Health
            </Link>
          </CardContent>
        </Card>
      </div>

      {!goals || goals.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-14 text-center">
            <Target className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No goals yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Add a goal such as an emergency fund, a home down payment or retirement. We will
              show progress and the monthly contribution it needs.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create your first goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <Card key={goal.id} className={cn(goal.status === "ABANDONED" ? "opacity-70" : undefined)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">{goal.name}</CardTitle>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3 w-3" />
                      {goal.monthsRemaining > 0
                        ? `${goal.monthsRemaining} months to ${formatGoalDate(goal.targetDate)}`
                        : goal.remaining > 0
                          ? `Target date passed (${formatGoalDate(goal.targetDate)})`
                          : `Reached on ${formatGoalDate(goal.targetDate)}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      statusClass(goal.status)
                    )}
                  >
                    {goalStatusLabel(goal.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-semibold">{formatCurrency(goal.currentAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    of {formatCurrency(goal.targetAmount)}
                  </p>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      goal.status === "COMPLETED" ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{ width: `${goal.progressPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {goal.progressPercent.toFixed(1)}% funded
                  {goal.remaining > 0 ? ` · ${formatCurrency(goal.remaining)} to go` : " · goal met"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Your monthly
                    </p>
                    <p className="font-medium">
                      {goal.monthlyContribution ? formatCurrency(goal.monthlyContribution) : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Needed monthly
                    </p>
                    <p className="font-medium">
                      {goal.remaining > 0 ? formatCurrency(goal.requiredMonthly) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      at {goal.returnAssumption}% assumed return
                    </p>
                  </div>
                </div>

                {goal.remaining > 0 && (
                  <p
                    className={cn(
                      "mt-3 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      goal.onTrack
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    )}
                  >
                    {goal.onTrack ? "On track" : "Contribution below requirement"}
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="Add contribution (₹)"
                    value={contributions[goal.id] ?? ""}
                    onChange={(event) =>
                      setContributions((current) => ({
                        ...current,
                        [goal.id]: event.target.value,
                      }))
                    }
                    aria-label={`Contribution amount for ${goal.name}`}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void addContribution(goal)}
                      disabled={busyId === goal.id}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(goal)}
                      aria-label={`Edit ${goal.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeGoal(goal)}
                      disabled={busyId === goal.id}
                      aria-label={`Delete ${goal.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Required monthly contributions assume a constant {10}% annual return and are illustrative,
        not guarantees. Contributions you add here update your saved amount only — they do not move
        money or create transactions.
      </p>

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={editing}
        onSaved={() => void load()}
      />
    </div>
  )
}
