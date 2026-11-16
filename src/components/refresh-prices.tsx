"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSummary } from "@/components/summary-provider"
import { cn } from "@/lib/utils"

export function RefreshPricesButton({ className }: { className?: string }) {
  const { refresh } = useSummary()
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
          payload?.unavailable ? ` · ${payload.unavailable} without a market price` : ""
        }`
      )
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh prices")
    } finally {
      setBusy(false)
    }
  }

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
