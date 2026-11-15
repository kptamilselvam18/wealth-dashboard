import type { MarketQuote, QuoteRequest } from "./types"

type MfApiLatest = {
  meta?: { scheme_code?: number; scheme_name?: string }
  data?: Array<{ date?: string; nav?: string }>
}

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

/** MFAPI returns dates as `DD-MM-YYYY`; parse without timezone surprises. */
export function parseMfDate(value: string | undefined): string | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const iso = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12))
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString()
}

export function parseMfApiLatest(payload: unknown, requestedSymbol: string): MarketQuote | null {
  const data = payload as MfApiLatest
  const latest = data?.data?.[0]
  const nav = latest?.nav ? Number(latest.nav) : NaN
  if (!Number.isFinite(nav) || nav <= 0) return null

  return {
    symbol: requestedSymbol,
    price: nav,
    previousClose: null,
    currency: "INR",
    source: "mfapi",
    asOf: parseMfDate(latest?.date) ?? new Date().toISOString(),
    stale: false,
  }
}

export async function fetchMfApiQuote(request: QuoteRequest): Promise<MarketQuote | null> {
  const code = request.symbol.trim()
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(code)}/latest`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!response.ok) return null
    return parseMfApiLatest(await response.json(), request.symbol)
  } catch {
    return null
  }
}
