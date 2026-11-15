import { prisma } from "@/lib/prisma"
import { getQuotes, resolveProviderId } from "@/lib/market-data"
import { notifyPendingAlerts } from "@/lib/notifications/alert-email"
import {
  changePercent,
  evaluateAlerts,
  type AlertEventView,
  type WatchlistItemRecord,
  type WatchlistView,
} from "./watchlists"

type ItemRow = {
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
  priceStale: boolean
  priceUpdatedAt: Date | null
  alertAbove: number | null
  alertBelow: number | null
  alertChangePercent: number | null
  aboveActive: boolean
  belowActive: boolean
  changeActive: boolean
  createdAt: Date
  updatedAt: Date
}

export function toItemView(item: ItemRow): WatchlistItemRecord {
  return {
    id: item.id,
    watchlistId: item.watchlistId,
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchange,
    assetType: item.assetType,
    currency: item.currency,
    price: item.price,
    previousPrice: item.previousPrice,
    priceSource: item.priceSource,
    priceStale: item.priceStale,
    priceUpdatedAt: item.priceUpdatedAt?.toISOString() ?? null,
    alertAbove: item.alertAbove,
    alertBelow: item.alertBelow,
    alertChangePercent: item.alertChangePercent,
    aboveActive: item.aboveActive,
    belowActive: item.belowActive,
    changeActive: item.changeActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}

function quoteRequest(item: ItemRow) {
  return {
    symbol: item.symbol,
    assetType: item.assetType,
    exchange: item.exchange,
    currency: item.currency,
  }
}

export async function listWatchlists(userId: string): Promise<{
  watchlists: WatchlistView[]
  events: AlertEventView[]
  unread: number
  meta: { provider: string }
}> {
  const [watchlists, events, unread] = await Promise.all([
    prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.alertEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { item: { select: { symbol: true } } },
    }),
    prisma.alertEvent.count({ where: { userId, readAt: null } }),
  ])

  return {
    watchlists: watchlists.map((watchlist) => ({
      id: watchlist.id,
      name: watchlist.name,
      createdAt: watchlist.createdAt.toISOString(),
      items: watchlist.items.map((item) => ({
        ...toItemView(item),
        changePercent: changePercent(item.price, item.previousPrice),
      })),
    })),
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      price: event.price,
      threshold: event.threshold,
      symbol: event.item.symbol,
      createdAt: event.createdAt.toISOString(),
      readAt: event.readAt?.toISOString() ?? null,
    })),
    unread,
    meta: { provider: resolveProviderId() },
  }
}

/**
 * Refresh quotes through the configured provider and record alert crossings.
 * Manual prices are respected and never overwritten by a refresh.
 */
export async function refreshWatchlistQuotes(
  userId: string,
  watchlistId?: string
): Promise<{
  updated: number
  triggered: number
  unavailable: number
  notified: number
  provider: string
}> {
  const provider = resolveProviderId()
  const items = await prisma.watchlistItem.findMany({
    where: {
      watchlist: { userId },
      ...(watchlistId ? { watchlistId } : {}),
    },
  })

  const refreshable = items.filter((item) => item.priceSource !== "manual")
  if (refreshable.length === 0) {
    return { updated: 0, triggered: 0, unavailable: 0, notified: 0, provider }
  }

  const { quotes, unavailable } = await getQuotes(refreshable.map(quoteRequest))
  let triggered = 0
  let updated = 0

  for (const item of refreshable) {
    const quote = quotes.get(item.symbol)
    if (!quote) continue

    const evaluation = evaluateAlerts(item, quote.price, quote.previousClose ?? item.previousPrice)
    triggered += evaluation.triggers.length
    updated += 1

    await prisma.$transaction([
      prisma.watchlistItem.update({
        where: { id: item.id },
        data: {
          price: quote.price,
          previousPrice: quote.previousClose,
          priceSource: quote.source,
          priceStale: quote.stale,
          priceUpdatedAt: new Date(),
          aboveActive: evaluation.aboveActive,
          belowActive: evaluation.belowActive,
          changeActive: evaluation.changeActive,
        },
      }),
      ...evaluation.triggers.map((trigger) =>
        prisma.alertEvent.create({
          data: {
            userId,
            itemId: item.id,
            type: trigger.type,
            price: trigger.price,
            threshold: trigger.threshold,
            message: trigger.message,
          },
        })
      ),
    ])
  }

  let notified = 0
  if (triggered > 0) {
    try {
      notified = (await notifyPendingAlerts(userId)).sent
    } catch (error) {
      // Email is best-effort; alert recording must not fail because of it.
      console.error("Alert notification failed:", error)
    }
  }

  return { updated, triggered, unavailable: unavailable.length, notified, provider }
}

/** Fetch the first quote for a newly added item (never fabricates a price). */
export async function initialQuoteForItem(item: ItemRow) {
  const { quotes } = await getQuotes([quoteRequest(item)])
  return quotes.get(item.symbol) ?? null
}

/** Set a manual price and evaluate alerts against it (fires on crossing). */
export async function setManualPrice(
  userId: string,
  itemId: string,
  price: number
): Promise<{ triggered: number; notified: number }> {
  const item = await prisma.watchlistItem.findFirst({
    where: { id: itemId, watchlist: { userId } },
  })
  if (!item) throw new Error("Item not found")

  const previousPrice = item.price ?? item.previousPrice
  const evaluation = evaluateAlerts(item, price, previousPrice)

  await prisma.$transaction([
    prisma.watchlistItem.update({
      where: { id: item.id },
      data: {
        price,
        previousPrice,
        priceSource: "manual",
        priceStale: false,
        priceUpdatedAt: new Date(),
        aboveActive: evaluation.aboveActive,
        belowActive: evaluation.belowActive,
        changeActive: evaluation.changeActive,
      },
    }),
    ...evaluation.triggers.map((trigger) =>
      prisma.alertEvent.create({
        data: {
          userId,
          itemId: item.id,
          type: trigger.type,
          price: trigger.price,
          threshold: trigger.threshold,
          message: trigger.message,
        },
      })
    ),
  ])

  let notified = 0
  if (evaluation.triggers.length > 0) {
    try {
      notified = (await notifyPendingAlerts(userId)).sent
    } catch (error) {
      console.error("Alert notification failed:", error)
    }
  }

  return { triggered: evaluation.triggers.length, notified }
}

/**
 * Initialise crossing flags for an alert that is already true when created, so
 * a new rule does not instantly fire for a condition the user can already see.
 */
export function initialFlags(
  item: { alertAbove: number | null; alertBelow: number | null; alertChangePercent: number | null },
  price: number | null,
  previousPrice: number | null
) {
  if (price === null) {
    return { aboveActive: false, belowActive: false, changeActive: false }
  }
  return {
    aboveActive: item.alertAbove !== null && price >= item.alertAbove,
    belowActive: item.alertBelow !== null && price <= item.alertBelow,
    changeActive:
      item.alertChangePercent !== null &&
      Math.abs(changePercent(price, previousPrice) ?? 0) >= item.alertChangePercent,
  }
}
