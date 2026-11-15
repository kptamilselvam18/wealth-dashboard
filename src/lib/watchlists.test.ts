import { describe, expect, it } from "vitest"
import {
  changePercent,
  demoQuote,
  evaluateAlerts,
  type WatchlistItemRecord,
} from "./watchlists"

function item(overrides: Partial<WatchlistItemRecord> = {}): WatchlistItemRecord {
  return {
    id: "item_1",
    watchlistId: "list_1",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    exchange: "NSE",
    assetType: "stock",
    currency: "INR",
    price: 2800,
    previousPrice: 2700,
    priceSource: "manual",
    priceStale: false,
    priceUpdatedAt: "2026-01-01T00:00:00.000Z",
    alertAbove: null,
    alertBelow: null,
    alertChangePercent: null,
    aboveActive: false,
    belowActive: false,
    changeActive: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("demo quotes", () => {
  it("is deterministic per symbol", () => {
    expect(demoQuote("RELIANCE")).toEqual(demoQuote("RELIANCE"))
    expect(demoQuote("RELIANCE").price).not.toBe(demoQuote("TCS").price)
  })

  it("always produces positive prices and a previous close", () => {
    for (const symbol of ["A", "TCS", "HDFC.NS", "some-fund"]) {
      const quote = demoQuote(symbol)
      expect(quote.price).toBeGreaterThan(0)
      expect(quote.previousPrice).toBeGreaterThan(0)
    }
  })
})

describe("change percent", () => {
  it("computes a signed percentage", () => {
    expect(changePercent(110, 100)).toBeCloseTo(10, 5)
    expect(changePercent(90, 100)).toBeCloseTo(-10, 5)
  })

  it("returns null without a usable previous price", () => {
    expect(changePercent(null, 100)).toBeNull()
    expect(changePercent(100, 0)).toBeNull()
    expect(changePercent(100, null)).toBeNull()
  })
})

describe("alert evaluation", () => {
  it("fires a price-above alert on the crossing only", () => {
    const first = evaluateAlerts(item({ alertAbove: 2750 }), 2800, 2700)
    expect(first.triggers).toHaveLength(1)
    expect(first.triggers[0].type).toBe("PRICE_ABOVE")
    expect(first.aboveActive).toBe(true)

    const second = evaluateAlerts(
      item({ alertAbove: 2750, aboveActive: first.aboveActive }),
      2850,
      2700
    )
    expect(second.triggers).toHaveLength(0)
    expect(second.aboveActive).toBe(true)
  })

  it("re-arms after the price falls back below the threshold", () => {
    const rearmed = evaluateAlerts(item({ alertAbove: 3000, aboveActive: true }), 2900, 2700)
    expect(rearmed.aboveActive).toBe(false)
    expect(rearmed.triggers).toHaveLength(0)

    const fired = evaluateAlerts(
      item({ alertAbove: 3000, aboveActive: rearmed.aboveActive }),
      3100,
      2700
    )
    expect(fired.triggers).toHaveLength(1)
  })

  it("fires a price-below alert", () => {
    const result = evaluateAlerts(item({ alertBelow: 2850 }), 2800, 2700)
    expect(result.triggers[0].type).toBe("PRICE_BELOW")
    expect(result.belowActive).toBe(true)
  })

  it("fires a percentage-change alert in either direction", () => {
    const up = evaluateAlerts(item({ alertChangePercent: 5 }), 2800, 2600)
    expect(up.triggers[0].type).toBe("CHANGE_PERCENT")

    const down = evaluateAlerts(item({ alertChangePercent: 5 }), 2400, 2600)
    expect(down.triggers).toHaveLength(1)
    expect(down.triggers[0].message).toContain("-7.7%")
  })

  it("does not fire percentage alerts without a previous price", () => {
    const result = evaluateAlerts(item({ alertChangePercent: 1 }), 2800, null)
    expect(result.triggers).toHaveLength(0)
    expect(result.changeActive).toBe(false)
  })

  it("can fire multiple rules at once", () => {
    const result = evaluateAlerts(
      item({ alertAbove: 2750, alertBelow: 3000, alertChangePercent: 2 }),
      2800,
      2700
    )
    expect(result.triggers.map((trigger) => trigger.type).sort()).toEqual([
      "CHANGE_PERCENT",
      "PRICE_ABOVE",
      "PRICE_BELOW",
    ])
  })

  it("reports no triggers when no rules are configured", () => {
    const result = evaluateAlerts(item(), 2800, 2700)
    expect(result.triggers).toHaveLength(0)
    expect(result.aboveActive).toBe(false)
  })
})
