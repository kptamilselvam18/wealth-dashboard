export const ALERT_TYPES = ["PRICE_ABOVE", "PRICE_BELOW", "CHANGE_PERCENT"] as const
export type AlertTypeValue = (typeof ALERT_TYPES)[number]

export interface WatchlistItemRecord {
  id: string
  watchlistId: string
  symbol: string
  name: string
  exchange: string | null
  assetType: string
  currency: string
  price: number | null
  previousPrice: number | null
  priceSource: string | null
  priceUpdatedAt: string | null
  alertAbove: number | null
  alertBelow: number | null
  alertChangePercent: number | null
  aboveActive: boolean
  belowActive: boolean
  changeActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WatchlistItemView extends WatchlistItemRecord {
  changePercent: number | null
}

export interface WatchlistView {
  id: string
  name: string
  createdAt: string
  items: WatchlistItemView[]
}

export interface AlertEventView {
  id: string
  type: string
  message: string
  price: number
  threshold: number | null
  symbol: string
  createdAt: string
  readAt: string | null
}

export interface AlertTrigger {
  type: AlertTypeValue
  price: number
  threshold: number
  message: string
}

export interface AlertEvaluation {
  triggers: AlertTrigger[]
  aboveActive: boolean
  belowActive: boolean
  changeActive: boolean
}

/** Deterministic demo quote used until a real market-data provider is wired in. */
export function demoQuote(symbol: string): { price: number; previousPrice: number } {
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
    previousPrice: Math.round((price / (1 + deltaPercent)) * 100) / 100,
  }
}

export function changePercent(price: number | null, previousPrice: number | null): number | null {
  if (price === null || previousPrice === null || previousPrice <= 0) return null
  return ((price - previousPrice) / previousPrice) * 100
}

/**
 * Decide which alerts crossed on this evaluation. A rule fires only when it
 * becomes true, and re-arms when the condition stops being true.
 */
export function evaluateAlerts(
  item: Pick<
    WatchlistItemRecord,
    | "symbol"
    | "alertAbove"
    | "alertBelow"
    | "alertChangePercent"
    | "aboveActive"
    | "belowActive"
    | "changeActive"
  >,
  price: number,
  previousPrice: number | null
): AlertEvaluation {
  const triggers: AlertTrigger[] = []

  let aboveActive = item.aboveActive
  if (item.alertAbove !== null) {
    const isAbove = price >= item.alertAbove
    if (isAbove && !item.aboveActive) {
      triggers.push({
        type: "PRICE_ABOVE",
        price,
        threshold: item.alertAbove,
        message: `${item.symbol} rose to ${price.toFixed(2)}, at or above your ${item.alertAbove.toFixed(2)} alert.`,
      })
    }
    aboveActive = isAbove
  }

  let belowActive = item.belowActive
  if (item.alertBelow !== null) {
    const isBelow = price <= item.alertBelow
    if (isBelow && !item.belowActive) {
      triggers.push({
        type: "PRICE_BELOW",
        price,
        threshold: item.alertBelow,
        message: `${item.symbol} fell to ${price.toFixed(2)}, at or below your ${item.alertBelow.toFixed(2)} alert.`,
      })
    }
    belowActive = isBelow
  }

  let changeActive = item.changeActive
  if (item.alertChangePercent !== null) {
    const change = changePercent(price, previousPrice)
    const threshold = item.alertChangePercent
    const isBeyond = change !== null && Math.abs(change) >= threshold
    if (isBeyond && !item.changeActive && change !== null) {
      triggers.push({
        type: "CHANGE_PERCENT",
        price,
        threshold,
        message: `${item.symbol} moved ${change >= 0 ? "+" : ""}${change.toFixed(1)}% in the latest comparison, beyond your ${threshold}% alert.`,
      })
    }
    changeActive = isBeyond
  }

  return { triggers, aboveActive, belowActive, changeActive }
}

export function alertTypeLabel(type: string): string {
  if (type === "PRICE_ABOVE") return "Price above"
  if (type === "PRICE_BELOW") return "Price below"
  if (type === "CHANGE_PERCENT") return "% change"
  return type
}

export function priceSourceLabel(source: string | null): string {
  if (source === "manual") return "Manual price"
  if (source === "demo") return "Demo quote"
  return "No price"
}
