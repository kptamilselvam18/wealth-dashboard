"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSummary } from "@/components/summary-provider"
import { cn } from "@/lib/utils"

export function RefreshPricesButton({ className }: { className?: string }) {
  const { summary, refresh } = useSummary()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/prices/refresh", { method: "POST" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Could not refresh prices")
      await refresh()
      setNotice(
        `Updated ${payload?.updated ?? 0} holding${payload?.updated === 1 ? "" : "s"}${
          payload?.unavailable
            ? ` · no quote for ${(payload.unavailableSymbols ?? []).join(", ")}`
            : ""
        }`
      )
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh prices")
    } finally {
      setBusy(false)
    }
  }

  // Automatically value holdings when quotes are missing or older than the
  // cache window, so a newly added investment gets a live price without a click.
  const autoRan = useRef(false)
  useEffect(() => {
    if (autoRan.current || !summary || busy) return
    const priced = summary.holdings.some(
      (holding) => holding.type !== "Cash" && Boolean(holding.symbol)
    )
    if (!priced) return
    const asOf = summary.pricesAsOf ? new Date(summary.pricesAsOf).getTime() : 0
    const stale = !asOf || Date.now() - asOf > 15 * 60 * 1000
    if (!stale) return
    autoRan.current = true
    void handleRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={busy}
        title="Fetch the latest provider quotes and record a portfolio snapshot"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", busy ? "animate-spin" : "")} />
        {busy ? "Refreshing..." : "Refresh prices"}
      </Button>
      {(notice || error) && (
        <p className={cn("text-[11px]", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? notice}
        </p>
      )}
    </div>
  )
}
