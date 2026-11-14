"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  getCalculators,
  getCalculatorsByCategory,
} from "@/lib/calculators/definitions"
import { cn } from "@/lib/utils"

export default function CalculatorsPage() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("All")

  const calculators = getCalculators()
  const categories = useMemo(() => {
    const unique = Array.from(new Set(calculators.map((item) => item.category)))
    return ["All", ...unique]
  }, [calculators])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return calculators.filter((calculator) => {
      const matchesCategory = category === "All" || calculator.category === category
      const matchesQuery =
        !needle ||
        calculator.name.toLowerCase().includes(needle) ||
        calculator.tagline.toLowerCase().includes(needle) ||
        calculator.description.toLowerCase().includes(needle)
      return matchesCategory && matchesQuery
    })
  }, [calculators, category, query])

  const groups = useMemo(
    () =>
      getCalculatorsByCategory()
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => filtered.includes(item)),
        }))
        .filter((group) => group.items.length > 0),
    [filtered]
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calculators</h1>
        <p className="text-muted-foreground">
          {calculators.length} deterministic calculators for returns, loans, planning and tax.
          Every result shows its formula and assumptions.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search calculators, e.g. SIP, EMI, retirement"
            className="pl-9"
            aria-label="Search calculators"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No calculators match “{query}”. Try a different search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((calculator) => (
                  <Link key={calculator.slug} href={`/calculators/${calculator.slug}`}>
                    <Card className="h-full transition-colors hover:border-primary/60">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base font-semibold">
                          {calculator.name}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{calculator.tagline}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
