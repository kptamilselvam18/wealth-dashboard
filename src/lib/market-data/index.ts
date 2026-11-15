import { prisma } from "@/lib/prisma"
import { fetchMfApiQuote } from "./mfapi"
import { fetchSampleQuotes } from "./sample"
import { isMutualFundSchemeCode } from "./symbols"
import type { MarketQuote, ProviderId, QuoteRequest, QuoteResult } from "./types"
import { fetchYahooQuotes } from "./yahoo"

export const DEFAULT_QUOTE_TTL_SECONDS = 15 * 60
export const MUTUAL_FUND_TTL_SECONDS = 6 * 60 * 60

/** `sample` is only used when explicitly selected; production defaults to Yahoo. */
export function resolveProviderId(value = process.env.MARKET_DATA_PROVIDER): "yahoo" | "sample" {
  return value?.trim().toLowerCase() === "sample" ? "sample" : "yahoo"
}

export function quoteTtlSeconds(provider: ProviderId): number {
  if (provider === "sample") return 60
  const configured = Number(process.env.QUOTE_TTL_SECONDS)
  if (provider === "mfapi") return MUTUAL_FUND_TTL_SECONDS
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_QUOTE_TTL_SECONDS
}

export function isFresh(expiresAt: Date | string, now: Date = new Date()): boolean {
  const expiry = new Date(expiresAt).getTime()
  return Number.isFinite(expiry) && expiry > now.getTime()
}

export function quoteCacheKey(provider: ProviderId, request: QuoteRequest): string {
  return `${provider}:${request.symbol.trim().toUpperCase()}@${(request.exchange ?? "").toUpperCase()}`
}

function providerForRequest(request: QuoteRequest, configured: "yahoo" | "sample"): ProviderId {
  if (configured === "sample") return "sample"
  if (request.assetType === "mutual-fund" && isMutualFundSchemeCode(request.symbol)) return "mfapi"
  return "yahoo"
}

type CacheRow = {
  key: string
  price: number
  previousClose: number | null
  currency: string
  source: string
  fetchedAt: Date
  expiresAt: Date
}

function fromCache(row: CacheRow, symbol: string, stale: boolean): MarketQuote {
  return {
    symbol,
    price: row.price,
    previousClose: row.previousClose,
    currency: row.currency,
    source: row.source,
    asOf: row.fetchedAt.toISOString(),
    stale,
  }
}

async function readCache(keys: string[]): Promise<Map<string, CacheRow>> {
  if (keys.length === 0) return new Map()
  try {
    const rows = await prisma.quoteCache.findMany({ where: { key: { in: keys } } })
    return new Map(rows.map((row) => [row.key, row]))
  } catch (error) {
    console.error("Quote cache read failed, continuing without cache:", error)
    return new Map()
  }
}

async function writeCache(
  entries: Array<{ key: string; request: QuoteRequest; provider: ProviderId; quote: MarketQuote }>
): Promise<void> {
  try {
    const now = new Date()
    await Promise.all(
      entries.map(({ key, request, provider, quote }) =>
        prisma.quoteCache.upsert({
          where: { key },
          create: {
            key,
            symbol: request.symbol,
            provider,
            price: quote.price,
            previousClose: quote.previousClose,
            currency: quote.currency,
            source: quote.source,
            fetchedAt: now,
            expiresAt: new Date(now.getTime() + quoteTtlSeconds(provider) * 1000),
          },
          update: {
            price: quote.price,
            previousClose: quote.previousClose,
            currency: quote.currency,
            source: quote.source,
            fetchedAt: now,
            expiresAt: new Date(now.getTime() + quoteTtlSeconds(provider) * 1000),
          },
        })
      )
    )
  } catch (error) {
    console.error("Quote cache write failed:", error)
  }
}

/**
 * Resolve quotes through the configured provider with a database cache.
 * Failures never fabricate a price: expired cache entries are returned marked
 * stale, and symbols with nothing cached are reported as unavailable.
 */
export async function getQuotes(requests: QuoteRequest[]): Promise<QuoteResult> {
  const configured = resolveProviderId()
  const unique = new Map<string, QuoteRequest>()
  for (const request of requests) {
    if (!unique.has(request.symbol)) unique.set(request.symbol, request)
  }
  const all = Array.from(unique.values())
  const providerBySymbol = new Map<string, ProviderId>()
  for (const request of all) providerBySymbol.set(request.symbol, providerForRequest(request, configured))

  const keys = all.map((request) =>
    quoteCacheKey(providerBySymbol.get(request.symbol) as ProviderId, request)
  )
  const cache = await readCache(keys)

  const quotes = new Map<string, MarketQuote>()
  const unavailable: string[] = []
  const pending: Array<{ request: QuoteRequest; provider: ProviderId; key: string }> = []

  for (const request of all) {
    const provider = providerBySymbol.get(request.symbol) as ProviderId
    const key = quoteCacheKey(provider, request)
    const row = cache.get(key)
    if (row && isFresh(row.expiresAt)) {
      quotes.set(request.symbol, fromCache(row, request.symbol, false))
    } else {
      pending.push({ request, provider, key })
    }
  }

  const fetched: Array<{ key: string; request: QuoteRequest; provider: ProviderId; quote: MarketQuote }> = []

  const yahooRequests = pending.filter((entry) => entry.provider === "yahoo").map((entry) => entry.request)
  if (yahooRequests.length > 0) {
    const yahooQuotes = await fetchYahooQuotes(yahooRequests)
    for (const entry of pending.filter((item) => item.provider === "yahoo")) {
      const quote = yahooQuotes.get(entry.request.symbol)
      if (quote) {
        quotes.set(entry.request.symbol, quote)
        fetched.push({ ...entry, quote })
      }
    }
  }

  for (const entry of pending.filter((item) => item.provider === "mfapi")) {
    const quote = await fetchMfApiQuote(entry.request)
    if (quote) {
      quotes.set(entry.request.symbol, quote)
      fetched.push({ ...entry, quote })
    }
  }

  const sampleRequests = pending.filter((entry) => entry.provider === "sample")
  if (sampleRequests.length > 0) {
    const sampleQuotes = fetchSampleQuotes(sampleRequests.map((entry) => entry.request))
    for (const entry of sampleRequests) {
      const quote = sampleQuotes.get(entry.request.symbol)
      if (quote) {
        quotes.set(entry.request.symbol, quote)
        fetched.push({ ...entry, quote })
      }
    }
  }

  if (fetched.length > 0) {
    await writeCache(fetched)
  }

  for (const entry of pending) {
    if (quotes.has(entry.request.symbol)) continue
    const row = cache.get(entry.key)
    if (row) {
      quotes.set(entry.request.symbol, fromCache(row, entry.request.symbol, true))
    } else {
      unavailable.push(entry.request.symbol)
    }
  }

  return { quotes, provider: configured, unavailable }
}
