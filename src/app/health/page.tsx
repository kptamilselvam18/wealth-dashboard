"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  CircleHelp,
  HeartPulse,
  Info,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FactorCard } from "@/components/health/factor-card"
import { HealthHistoryChart } from "@/components/health/history-chart"
import { ScoreRing } from "@/components/health/score-ring"
import type { HealthResponse, HealthSnapshot } from "@/lib/health/types"
import { formatDate } from "@/lib/format"

function numberOrNull(value: string): number {
  const trimmed = value.trim()
  return trimmed === "" ? Number.NaN : Number(trimmed)
}

function MilestoneIcon({ status }: { status: "met" | "not-met" | "unknown" }) {
  if (status === "met") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Check className="h-3 w-3" />
      </span>
    )
  }
  if (status === "not-met") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <X className="h-3 w-3" />
      </span>
    )
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <CircleHelp className="h-3 w-3" />
    </span>
  )
}

function SnapshotRow({ snapshot }: { snapshot: HealthSnapshot }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{formatDate(snapshot.createdAt)}</span>
      <span className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {Math.round(snapshot.coverage * 100)}% data
        </span>
        <span className="font-medium tabular-nums">{Math.round(snapshot.score)}</span>
      </span>
    </li>
  )
}

export default function FinancialHealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingCheckIn, setSavingCheckIn] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null)
  const [form, setForm] = useState({ monthlyIncome: "", monthlyExpenses: "", age: "" })

  const load = useCallback(async (showSkeleton: boolean) => {
    if (showSkeleton) setLoading(true)
    try {
      const response = await fetch("/api/health", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to view your financial health"
            : "Could not load your financial health"
        )
      }
      const payload: HealthResponse = await response.json()
      setData(payload)
      setError(null)
      setForm({
        monthlyIncome: payload.profile.monthlyIncome?.toString() ?? "",
        monthlyExpenses: payload.profile.monthlyExpenses?.toString() ?? "",
        age: payload.profile.age?.toString() ?? "",
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your financial health")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const saveCheckIn = async () => {
    setSavingCheckIn(true)
    setCheckInMessage(null)
    try {
      const response = await fetch("/api/health", { method: "POST" })
      if (!response.ok) throw new Error("Could not save this check-in")
      await load(false)
      setCheckInMessage("Check-in saved to your history")
    } catch (cause) {
      setCheckInMessage(cause instanceof Error ? cause.message : "Could not save this check-in")
    } finally {
      setSavingCheckIn(false)
    }
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setProfileMessage(null)

    const income = form.monthlyIncome.trim() === "" ? null : numberOrNull(form.monthlyIncome)
    const expenses =
      form.monthlyExpenses.trim() === "" ? null : numberOrNull(form.monthlyExpenses)
    const age = form.age.trim() === "" ? null : Number(form.age)

    if (income !== null && !Number.isFinite(income)) {
      setProfileMessage("Monthly income must be a number")
      return
    }
    if (expenses !== null && !Number.isFinite(expenses)) {
      setProfileMessage("Monthly expenses must be a number")
      return
    }
    if (age !== null && (!Number.isFinite(age) || age < 15 || age > 100)) {
      setProfileMessage("Age must be between 15 and 100")
      return
    }

    setSavingProfile(true)
    try {
      const response = await fetch("/api/health/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyIncome: income,
          monthlyExpenses: expenses,
          age,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not save your profile")
      }
      await load(false)
      setProfileMessage("Saved — your score has been recalculated")
    } catch (cause) {
      setProfileMessage(cause instanceof Error ? cause.message : "Could not save your profile")
    } finally {
      setSavingProfile(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-48 animate-pulse rounded-xl bg-muted lg:col-span-2" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <HeartPulse className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Financial health unavailable</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void load(true)}>
          Try again
        </Button>
      </div>
    )
  }

  const health = data.current
  const hasScore = health.coverage > 0
  const measuredFactors = health.factors.filter((factor) => factor.status === "measured")
  const age = health.financialAge
  const history = data.history

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <HeartPulse className="h-6 w-6 text-primary" /> Financial Health
          </h1>
          <p className="text-muted-foreground">
            A transparent score from six factors. Missing data is marked unknown, never counted
            against you.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => void saveCheckIn()} disabled={savingCheckIn}>
            <Save className="h-4 w-4" />
            {savingCheckIn ? "Saving…" : "Save check-in"}
          </Button>
          {checkInMessage && (
            <span className="text-xs text-muted-foreground">{checkInMessage}</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-0 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground lg:col-span-2">
          <CardContent className="flex flex-col items-start justify-between gap-6 pt-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium opacity-90">Financial Health Score</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-bold leading-none tracking-tight">
                  {hasScore ? health.score : "—"}
                </span>
                <span className="pb-1 text-sm opacity-80">/ 100</span>
              </div>
              <span className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                {hasScore ? health.grade : "Not enough data yet"}
              </span>
              <p className="mt-4 max-w-md text-xs opacity-85">
                {measuredFactors.length} of {health.factors.length} factors measured ·{" "}
                {Math.round(health.coverage * 100)}% of the score is backed by your data
              </p>
            </div>
            <ScoreRing score={hasScore ? health.score : null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Financial Age</CardTitle>
          </CardHeader>
          <CardContent>
            {!age.available ? (
              <div className="py-2">
                <p className="text-3xl font-bold text-muted-foreground">—</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Measure at least three factors to estimate your financial age.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold leading-none">{age.age}</span>
                  <span className="pb-1 text-sm text-muted-foreground">years</span>
                </div>
                {age.difference === null ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add your age below to see how this compares with your actual age.
                  </p>
                ) : (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium">
                    {age.difference < 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    {age.difference === 0
                      ? "In line with your actual age"
                      : `${Math.abs(age.difference)} years ${
                          age.difference < 0 ? "younger (ahead)" : "older (behind)"
                        } than your age of ${age.actualAge}`}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Starts at {age.baseAge}, minus {age.credits} years earned from milestones
                  {age.penalty > 0 ? `, plus ${age.penalty.toFixed(1)} for a low score` : ""}.
                </p>
              </>
            )}

            <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1">
              {age.milestones.map((milestone) => (
                <li key={milestone.label} className="flex items-start gap-2 text-xs">
                  <MilestoneIcon status={milestone.status} />
                  <span className="min-w-0">
                    <span className="block font-medium">{milestone.label}</span>
                    <span className="block text-muted-foreground">
                      {milestone.detail} ·{" "}
                      {milestone.status === "met"
                        ? `+${milestone.credit} yrs`
                        : milestone.status === "unknown"
                          ? "not measured"
                          : `+${milestone.credit} yrs when met`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Your assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="monthlyIncome">Monthly income (₹)</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1000}
                  placeholder="e.g. 100000"
                  value={form.monthlyIncome}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, monthlyIncome: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthlyExpenses">Monthly expenses (₹)</Label>
                <Input
                  id="monthlyExpenses"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1000}
                  placeholder="e.g. 45000"
                  value={form.monthlyExpenses}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, monthlyExpenses: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="age">Age (optional)</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={15}
                  max={100}
                  placeholder="e.g. 32"
                  value={form.age}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, age: event.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col justify-end gap-1">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save assumptions"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Stored privately on your account and used only for this score.
                </p>
              </div>
            </div>
            {profileMessage && (
              <p className="text-xs text-muted-foreground">{profileMessage}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Factor breakdown</h2>
          <span className="text-xs text-muted-foreground">
            Each factor is scored 0–100 and weighted
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {health.factors.map((factor) => (
            <FactorCard key={factor.id} factor={factor} />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-base font-semibold">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            {health.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No factor is above 75 yet. The suggestions in each factor card are the fastest
                way to build one.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {health.strengths.map((strength) => (
                  <li
                    key={strength}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    {strength}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-base font-semibold">Where to focus</CardTitle>
          </CardHeader>
          <CardContent>
            {health.focusAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing measured is below 60. Keep contributions consistent and revisit this
                quarterly.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {health.focusAreas.map((area) => (
                  <li
                    key={area}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {health.unknownFactors.length > 0 && (
        <Card className="mt-6 border-dashed">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Info className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              {health.unknownFactors.length} factor
              {health.unknownFactors.length === 1 ? "" : "s"} not measurable yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Unknown factors are excluded from the score and its weights are redistributed.
              They do not reduce your score.
            </p>
            <ul className="space-y-2">
              {health.unknownFactors.map((factor) => (
                <li key={factor.label} className="text-sm">
                  <span className="font-medium">{factor.label}:</span>{" "}
                  <span className="text-muted-foreground">{factor.howTo}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Progress history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No check-ins saved yet. Save one now, then again next month, to see how your
                score changes.
              </p>
              <Button variant="outline" className="mt-3" onClick={() => void saveCheckIn()}>
                Save your first check-in
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                {history.length > 1 ? (
                  <HealthHistoryChart history={history} />
                ) : (
                  <p className="py-8 text-sm text-muted-foreground">
                    Save another check-in to plot your score over time.
                  </p>
                )}
              </div>
              <div>
                <ul>
                  {history.slice(0, 8).map((snapshot) => (
                    <SnapshotRow key={snapshot.id} snapshot={snapshot} />
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Check-ins are saved only when you press “Save check-in”. The current score is
                  always live.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted-foreground">
        This score and financial age are educational estimates built from the data you record.
        They are not financial advice, credit scores, or a medical measure. Projections and
        targets are illustrative, not guarantees.
      </p>
    </div>
  )
}
