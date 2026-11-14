"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import type { Summary } from "@/lib/summary-types"

type SummaryContextValue = {
  summary: Summary | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SummaryContext = React.createContext<SummaryContextValue>({
  summary: null,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function SummaryProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const [summary, setSummary] = React.useState<Summary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      setSummary(null)
      setError(null)
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/summary", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load your portfolio")
      const data = (await response.json()) as Summary
      setSummary(data)
      setError(null)
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Could not load your portfolio"
      )
    } finally {
      setLoading(false)
    }
  }, [status])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const value = React.useMemo(
    () => ({ summary, loading, error, refresh }),
    [summary, loading, error, refresh]
  )

  return <SummaryContext.Provider value={value}>{children}</SummaryContext.Provider>
}

export function useSummary() {
  return React.useContext(SummaryContext)
}
