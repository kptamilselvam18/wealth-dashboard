import { prisma } from "@/lib/prisma"
import { getQuotes, resolveProviderId } from "@/lib/market-data"
import type { MarketQuote, QuoteRequest } from "@/lib/market-data/types"
import { recordSnapshot } from "@/lib/portfolio"

const FUND_TYPE = /fund/i

export function isFundType(assetTypeName: string): boolean {
  return FUND_TYPE.test(assetTypeName) || assetTypeName.toLowerCase() === "mutual-fund"
}

/** Types the free providers can actually price in INR. */
export function isQuoteableAssetType(assetTypeName: string): boolean {
  const type = assetTypeName.toLowerCase()
  return (
    type === "stock" ||
    type === "equity" ||
    type === "etf" ||
    type === "index" ||
    isFundType(assetTypeName)
  )
}

/**
 * Yahoo-native symbols. Indian symbols without a suffix are tried on NSE first
 * and then as-is, so US tickers can still resolve; fund scheme codes stay bare.
 */
export function quoteSymbolCandidates(symbol: string): string[] {
  const trimmed = symbol.trim().toUpperCase()
  if (!trimmed) return []
  if (/^\d+$/.test(trimmed)) return [trimmed]
  if (trimmed.includes(".")) return [trimmed]
  return [`${trimmed}.NS`, trimmed]
}

export function quoteRequestFor(
  symbol: string,
  assetTypeName: string
): QuoteRequest {
  const exchange = symbol.endsWith(".NS")
    ? "NSE"
    : symbol.endsWith(".BO")
      ? "BSE"
      : null
  return {
    symbol,
    assetType: isFundType(assetTypeName) ? "mutual-fund" : "stock",
    exchange,
    currency: "INR",
  }
}

type AssetLike = {
  id: string
  symbol: string | null
  name: string
  assetType: { name: string }
}

async function resolveQuote(
  asset: AssetLike
): Promise<{ quote: MarketQuote; symbol: string } | null> {
  if (!asset.symbol) return null
  const candidates = quoteSymbolCandidates(asset.symbol)
  for (const candidate of candidates) {
    const result = await getQuotes([quoteRequestFor(candidate, asset.assetType.name)])
    const quote = result.quotes.get(candidate)
    if (quote) return { quote, symbol: candidate }
  }
  return null
}

/**
 * Price every quotable holding from the configured provider and store a
 * price-history row plus a portfolio snapshot. Assets without a provider price
 * keep their previous value and are counted as unavailable — nothing is guessed.
 */
export async function refreshPortfolioPrices(userId: string): Promise<{
  updated: number
  unavailable: number
  skipped: number
  assets: number
  provider: string
}> {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    include: { asset: { include: { assetType: true } } },
  })

  const assets = new Map<string, AssetLike>()
  for (const holding of holdings) {
    assets.set(holding.asset.id, {
      id: holding.asset.id,
      symbol: holding.asset.symbol,
      name: holding.asset.name,
      assetType: { name: holding.asset.assetType.name },
    })
  }

  const quoteable = [...assets.values()].filter(
    (asset) => asset.symbol && isQuoteableAssetType(asset.assetType.name)
  )
  const skipped = assets.size - quoteable.length
  const provider = resolveProviderId()

  let updated = 0
  for (const asset of quoteable) {
    const resolved = await resolveQuote(asset)
    if (!resolved) continue
    await prisma.priceHistory.create({
      data: {
        assetId: asset.id,
        price: resolved.quote.price,
        currency: resolved.quote.currency,
        source: resolved.quote.source,
        date: new Date(),
      },
    })
    updated += 1
  }

  if (updated > 0) {
    await recordSnapshot(userId)
  }

  return {
    updated,
    unavailable: quoteable.length - updated,
    skipped,
    assets: assets.size,
    provider,
  }
}

/** Best-effort market price for a newly added holding. */
export async function recordInitialQuote(
  assetId: string,
  symbol: string | null,
  assetTypeName: string
): Promise<boolean> {
  if (!symbol || !isQuoteableAssetType(assetTypeName)) return false
  const resolved = await resolveQuote({
    id: assetId,
    symbol,
    name: symbol,
    assetType: { name: assetTypeName },
  })
  if (!resolved) return false
  await prisma.priceHistory.create({
    data: {
      assetId,
      price: resolved.quote.price,
      currency: resolved.quote.currency,
      source: resolved.quote.source,
      date: new Date(),
    },
  })
  return true
}
