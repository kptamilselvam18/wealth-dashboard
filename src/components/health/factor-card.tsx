import { CircleHelp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { HealthFactor } from "@/lib/health/types"
import { cn } from "@/lib/utils"

function barColor(score: number | null): string {
  if (score === null) return "bg-muted-foreground/30"
  if (score >= 75) return "bg-emerald-500"
  if (score >= 55) return "bg-primary"
  if (score >= 35) return "bg-amber-500"
  return "bg-red-500"
}

export function FactorCard({ factor }: { factor: HealthFactor }) {
  const known = factor.score !== null

  return (
    <Card className={cn(!known ? "border-dashed" : undefined)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{factor.label}</p>
            <p className="text-xs text-muted-foreground">Weight {factor.weight}%</p>
          </div>
          {known ? (
            <span className="text-xl font-semibold tabular-nums">{factor.score}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              <CircleHelp className="h-3 w-3" /> Unknown
            </span>
          )}
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", barColor(factor.score))}
            style={{ width: `${known ? factor.score : 0}%` }}
          />
        </div>

        <p className="mt-3 text-sm font-medium">{factor.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{factor.evidence}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Target:</span> {factor.target}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{factor.tip}</p>
      </CardContent>
    </Card>
  )
}
