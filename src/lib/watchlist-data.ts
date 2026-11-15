import { prisma } from "@/lib/prisma"
import {
  changePercent,
  demoQuote,
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

export async function listWatchlists(
  userId: string
): Promise<{ watchlists: WatchlistView[]; events: AlertEventView[]; unread: number }> {
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
  }
}

/**
 * Refresh demo quotes for a user's watchlist items and record any alert
 * crossings. Demo values are written with `priceSource: "demo"` so the UI can
 * always label them instead of implying live market data.
 */
export async function refreshWatchlistQuotes(
  userId: string,
  watchlistId?: string
): Promise<{ updated: number; triggered: number }> {
  const items = await prisma.watchlistItem.findMany({
    where: {
      watchlist: { userId },
      ...(watchlistId ? { watchlistId } : {}),
    },
  })

  let triggered = 0

  for (const item of items) {
    const quote = demoQuote(item.symbol)
    const evaluation = evaluateAlerts(item, quote.price, quote.previousPrice)
    triggered += evaluation.triggers.length

    await prisma.$transaction([
      prisma.watchlistItem.update({
        where: { id: item.id },
        data: {
          price: quote.price,
          previousPrice: quote.previousPrice,
          priceSource: "demo",
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

  return { updated: items.length, triggered }
}

/** Set a manual price and evaluate alerts against it (fires on crossing). */
export async function setManualPrice(
  userId: string,
  itemId: string,
  price: number
): Promise<{ triggered: number }> {
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

  return { triggered: evaluation.triggers.length }
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
