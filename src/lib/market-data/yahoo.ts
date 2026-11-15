import type { MarketQuote, QuoteRequest } from "./types"
import { yahooSymbol } from "./symbols"

export function yahooChartUrl(symbol: string): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=5d&interval=1d`
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string
        symbol?: string
        regularMarketPrice?: number
        chartPreviousClose?: number
        previousClose?: number
        regularMarketTime?: number
      }
      indicators?: { quote?: Array<{ close?: Array<number | null> }> }
    }>
    error?: { code?: string; description?: string } | null
  }
}

/** Parse the chart payload; returns null for malformed or empty responses. */
export function parseYahooChart(payload: unknown, requestedSymbol: string): MarketQuote | null {
  const data = payload as YahooChartResponse
  const meta = data?.chart?.result?.[0]?.meta
  const price = meta?.regularMarketPrice
  if (!meta || typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null

  // With intraday prices, `chartPreviousClose` can equal the current price, so
  // prefer the second-to-last completed daily close when Yahoo provides it.
  const closes = (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  )
  const previousClose =
    closes.length >= 2
      ? closes[closes.length - 2]
      : typeof meta.chartPreviousClose === "number"
        ? meta.chartPreviousClose
        : typeof meta.previousClose === "number"
          ? meta.previousClose
          : null
  const asOf = meta.regularMarketTime
    ? new Date(meta.regularMarketTime * 1000).toISOString()
    : new Date().toISOString()

  return {
    symbol: requestedSymbol,
    price,
    previousClose,
    currency: meta.currency ?? "INR",
    source: "yahoo",
    asOf,
    stale: false,
  }
}

async function fetchOne(request: QuoteRequest): Promise<MarketQuote | null> {
  const symbol = yahooSymbol(request.symbol, request.exchange)
  try {
    const response = await fetch(yahooChartUrl(symbol), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WealthDashboard/1.0; +https://wealth-dashboard-khaki.vercel.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (!response.ok) return null
    const payload = await response.json()
    return parseYahooChart(payload, request.symbol)
  } catch {
    return null
  }
}

/** Fetch quotes with bounded concurrency to avoid hammering the provider. */
export async function fetchYahooQuotes(
  requests: QuoteRequest[],
  concurrency = 4
): Promise<Map<string, MarketQuote>> {
  const quotes = new Map<string, MarketQuote>()
  const queue = [...requests]

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const request = queue.shift()
      if (!request) break
      const quote = await fetchOne(request)
      if (quote) quotes.set(request.symbol, quote)
    }
  })

  await Promise.all(workers)
  return quotes
}
