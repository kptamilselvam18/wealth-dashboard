"use client"

import * as React from "react"
import { Download, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalculatorChart } from "@/components/calculators/calculator-chart"
import { getCalculator } from "@/lib/calculators/definitions"
import type {
  CalculatorDefinition,
  CalculatorOutput,
  CalculatorResult,
} from "@/lib/calculators/types"
import { cn } from "@/lib/utils"

function initialValues(calculator: CalculatorDefinition): Record<string, string> {
  return Object.fromEntries(
    calculator.fields.map((field) => [field.key, String(field.defaultValue)])
  )
}

function suffixFor(type: string): string {
  if (type === "percent") return "%"
  if (type === "years") return "yrs"
  if (type === "currency") return "₹"
  return ""
}

function formatResult(result: CalculatorResult): string {
  switch (result.format) {
    case "currency":
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(result.value)
    case "percent":
      return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(result.value)}%`
    case "years":
      return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(result.value)} years`
    case "months":
      return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(result.value)} months`
    default:
      return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(result.value)
  }
}

function downloadCsv(
  calculator: CalculatorDefinition,
  results: CalculatorResult[],
  chartData?: Record<string, number | string>[]
) {
  const lines = ["Label,Value"]
  results.forEach((result) => {
    lines.push(`"${result.label}","${formatResult(result).replace(/"/g, '""')}"`)
  })

  if (chartData?.length) {
    lines.push("")
    const keys = Object.keys(chartData[0])
    lines.push(keys.join(","))
    chartData.forEach((row) => {
      lines.push(keys.map((key) => row[key]).join(","))
    })
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${calculator.slug}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function CalculatorRunner({ slug }: { slug: string }) {
  const calculator = getCalculator(slug)
  const [values, setValues] = React.useState<Record<string, string>>(
    calculator ? initialValues(calculator) : {}
  )

  const output = React.useMemo<{
    data: CalculatorOutput | null
    error: string | null
  }>(() => {
    if (!calculator) return { data: null, error: "Calculator not found" }

    const parsed: Record<string, number> = {}
    for (const field of calculator.fields) {
      const value = Number(values[field.key])
      if (!Number.isFinite(value)) {
        return { data: null, error: `Enter a valid number for "${field.label}"` }
      }
      parsed[field.key] = value
    }

    try {
      return { data: calculator.compute(parsed), error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Could not calculate with these inputs",
      }
    }
  }, [calculator, values])

  if (!calculator) {
    return <p className="text-sm text-muted-foreground">Calculator not found.</p>
  }

  const update = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {calculator.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>
                {field.label}
                {suffixFor(field.type) && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({suffixFor(field.type)})
                  </span>
                )}
              </Label>
              <Input
                id={field.key}
                type="number"
                inputMode="decimal"
                value={values[field.key] ?? ""}
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                onChange={(event) => update(field.key, event.target.value)}
              />
              {field.help && (
                <p className="text-xs text-muted-foreground">{field.help}</p>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setValues(initialValues(calculator))}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={Boolean(output.error) || !output.data}
              onClick={() =>
                output.data && downloadCsv(calculator, output.data.results, output.data.chart?.data)
              }
            >
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {output.error || !output.data ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                {output.error ?? "Could not calculate with these inputs"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {output.data.results.map((result) => (
                <div
                  key={result.label}
                  className={cn(
                    "rounded-lg border p-5",
                    result.emphasis ? "bg-primary text-primary-foreground" : "bg-card"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm",
                      result.emphasis ? "opacity-90" : "text-muted-foreground"
                    )}
                  >
                    {result.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    {formatResult(result)}
                  </p>
                  {result.hint && (
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        result.emphasis ? "opacity-80" : "text-muted-foreground"
                      )}
                    >
                      {result.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {output.data.chart && output.data.chart.data.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    {calculator.tagline}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CalculatorChart chart={output.data.chart} />
                </CardContent>
              </Card>
            )}

            {output.data.notes && output.data.notes.length > 0 && (
              <Card>
                <CardContent className="space-y-2 pt-6">
                  {output.data.notes.map((note) => (
                    <p key={note} className="text-sm text-muted-foreground">
                      {note}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">How this is calculated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs">{calculator.formula}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {calculator.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Projections are estimates based on the inputs you provide. They are not guarantees.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
