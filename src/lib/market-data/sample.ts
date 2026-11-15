import type { MarketQuote, QuoteRequest } from "./types"

/**
 * Deterministic sample provider. Only used when MARKET_DATA_PROVIDER=sample is
 * set explicitly (local development and tests); every quote is labelled so it
 * can never be mistaken for a live market price.
 */
export function sampleQuote(symbol: string): { price: number; previousClose: number } {
  let hash = 0
  for (let index = 0; index < symbol.length; index += 1) {
    hash = (hash << 5) - hash + symbol.charCodeAt(index)
    hash |= 0
  }
  const base = Math.abs(hash) % 9900 + 100
  const deltaPercent = ((Math.abs(hash) % 1601) / 100 - 8) / 100
  const price = Math.round(base * 100) / 100
  return {
    price,
    previousClose: Math.round((price / (1 + deltaPercent)) * 100) / 100,
  }
}

export function fetchSampleQuotes(requests: QuoteRequest[]): Map<string, MarketQuote> {
  const quotes = new Map<string, MarketQuote>()
  const asOf = new Date().toISOString()
  for (const request of requests) {
    const { price, previousClose } = sampleQuote(request.symbol)
    quotes.set(request.symbol, {
      symbol: request.symbol,
      price,
      previousClose,
      currency: request.currency || "INR",
      source: "sample",
      asOf,
      stale: false,
    })
  }
  return quotes
}
