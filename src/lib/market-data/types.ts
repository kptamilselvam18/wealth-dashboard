export type ProviderId = "yahoo" | "mfapi" | "sample"

export interface QuoteRequest {
  /** The symbol exactly as the user stored it (used as the result key). */
  symbol: string
  assetType: string
  exchange: string | null
  currency: string
}

export interface MarketQuote {
  symbol: string
  price: number
  previousClose: number | null
  currency: string
  /** Provider label written to `WatchlistItem.priceSource`. */
  source: string
  /** Provider timestamp or fetch time, ISO string. */
  asOf: string
  /** True when the quote came from an expired cache entry. */
  stale: boolean
}

export interface QuoteResult {
  quotes: Map<string, MarketQuote>
  provider: ProviderId
  unavailable: string[]
}
