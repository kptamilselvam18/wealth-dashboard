"use client"

import * as React from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import { GOAL_STATUSES, goalStatusLabel, type GoalView } from "@/lib/goals"

function defaultTargetDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

export function GoalDialog({
  open,
  onOpenChange,
  goal,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: GoalView | null
  onSaved: () => void
}) {
  const [name, setName] = React.useState("")
  const [targetAmount, setTargetAmount] = React.useState("")
  const [currentAmount, setCurrentAmount] = React.useState("")
  const [targetDate, setTargetDate] = React.useState(defaultTargetDate())
  const [monthlyContribution, setMonthlyContribution] = React.useState("")
  const [status, setStatus] = React.useState("IN_PROGRESS")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (goal) {
      setName(goal.name)
      setTargetAmount(String(goal.targetAmount))
      setCurrentAmount(String(goal.currentAmount))
      setTargetDate(goal.targetDate.slice(0, 10))
      setMonthlyContribution(goal.monthlyContribution ? String(goal.monthlyContribution) : "")
      setStatus(goal.status)
    } else {
      setName("")
      setTargetAmount("")
      setCurrentAmount("")
      setTargetDate(defaultTargetDate())
      setMonthlyContribution("")
      setStatus("IN_PROGRESS")
    }
    setError(null)
  }, [open, goal])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        targetDate,
        monthlyContribution:
          monthlyContribution.trim() === "" ? null : Number(monthlyContribution),
        status,
      }

      if (!payload.name) throw new Error("Give the goal a name")
      if (!Number.isFinite(payload.targetAmount as number) || Number(targetAmount) <= 0) {
        throw new Error("Target amount must be greater than 0")
      }
      if (!Number.isFinite(payload.currentAmount as number) || Number(currentAmount || 0) < 0) {
        throw new Error("Saved amount cannot be negative")
      }

      const response = await fetch("/api/goals", {
        method: goal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal ? { ...payload, id: goal.id } : payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not save this goal")
      }

      onSaved()
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save this goal")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>
        <span className="hidden" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            Track what you are saving for and the monthly amount it needs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Goal name</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., Home down payment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target amount (₹)</Label>
              <Input
                id="goal-target"
                type="number"
                min="0"
                step="1000"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                placeholder="e.g., 2000000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-current">Already saved (₹)</Label>
              <Input
                id="goal-current"
                type="number"
                min="0"
                step="1000"
                value={currentAmount}
                onChange={(event) => setCurrentAmount(event.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-monthly">Monthly contribution (₹)</Label>
              <Input
                id="goal-monthly"
                type="number"
                min="0"
                step="500"
                value={monthlyContribution}
                onChange={(event) => setMonthlyContribution(event.target.value)}
                placeholder="e.g., 15000"
              />
            </div>
          </div>

          {goal && (
            <div className="space-y-1.5">
              <Label htmlFor="goal-status">Status</Label>
              <Select id="goal-status" value={status} onValueChange={setStatus}>
                {GOAL_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {goalStatusLabel(value)}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
