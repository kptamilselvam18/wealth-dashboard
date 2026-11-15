import { describe, expect, it } from "vitest"
import { isCronAuthorized } from "./cron"
import { isFresh, quoteCacheKey, quoteTtlSeconds, resolveProviderId } from "./index"
import { parseMfApiLatest, parseMfDate } from "./mfapi"
import { sampleQuote } from "./sample"
import { isMutualFundSchemeCode, yahooSymbol } from "./symbols"
import { parseYahooChart, yahooChartUrl } from "./yahoo"

describe("symbol mapping", () => {
  it("adds the right suffix for Indian exchanges", () => {
    expect(yahooSymbol("reliance", "NSE")).toBe("RELIANCE.NS")
    expect(yahooSymbol("reliance", "BSE")).toBe("RELIANCE.BO")
    expect(yahooSymbol("AAPL", "NASDAQ")).toBe("AAPL")
  })

  it("does not double-suffix symbols", () => {
    expect(yahooSymbol("RELIANCE.NS", "NSE")).toBe("RELIANCE.NS")
    expect(yahooSymbol("INFY.bo", "BSE")).toBe("INFY.BO")
  })

  it("recognises mutual fund scheme codes", () => {
    expect(isMutualFundSchemeCode("120503")).toBe(true)
    expect(isMutualFundSchemeCode("RELIANCE")).toBe(false)
    expect(isMutualFundSchemeCode("12")).toBe(false)
  })
})

describe("yahoo parsing", () => {
  const payload = {
    chart: {
      result: [
        {
          meta: {
            currency: "INR",
            regularMarketPrice: 1339.7,
            chartPreviousClose: 1328.4,
            regularMarketTime: 1794563884,
          },
        },
      ],
      error: null,
    },
  }

  it("builds an encoded chart URL", () => {
    expect(yahooChartUrl("RELIANCE.NS")).toContain("/v8/finance/chart/RELIANCE.NS?range=1d")
  })

  it("extracts price, previous close and timestamp", () => {
    const quote = parseYahooChart(payload, "RELIANCE")
    expect(quote?.price).toBe(1339.7)
    expect(quote?.previousClose).toBe(1328.4)
    expect(quote?.currency).toBe("INR")
    expect(quote?.source).toBe("yahoo")
    expect(quote?.stale).toBe(false)
    expect(quote?.asOf).toBe("2026-11-13T09:58:04.000Z")
  })

  it("returns null for errors and malformed payloads", () => {
    expect(parseYahooChart({ chart: { result: [] } }, "X")).toBeNull()
    expect(parseYahooChart({ chart: { result: [{ meta: { regularMarketPrice: 0 } }] } }, "X")).toBeNull()
    expect(parseYahooChart(null, "X")).toBeNull()
  })
})

describe("mfapi parsing", () => {
  it("parses the DD-MM-YYYY NAV date", () => {
    expect(parseMfDate("15-11-2026")).toBe("2026-11-15T12:00:00.000Z")
    expect(parseMfDate("not-a-date")).toBeNull()
    expect(parseMfDate(undefined)).toBeNull()
  })

  it("extracts the latest NAV", () => {
    const quote = parseMfApiLatest(
      { meta: { scheme_code: 120503 }, data: [{ date: "14-11-2026", nav: "82.4567" }] },
      "120503"
    )
    expect(quote?.price).toBeCloseTo(82.4567, 4)
    expect(quote?.source).toBe("mfapi")
    expect(quote?.asOf).toBe("2026-11-14T12:00:00.000Z")
  })

  it("rejects missing or invalid NAVs", () => {
    expect(parseMfApiLatest({ data: [] }, "1")).toBeNull()
    expect(parseMfApiLatest({ data: [{ nav: "N/A" }] }, "1")).toBeNull()
  })
})

describe("provider configuration", () => {
  it("defaults to yahoo and only uses sample when asked", () => {
    expect(resolveProviderId(undefined)).toBe("yahoo")
    expect(resolveProviderId("yahoo")).toBe("yahoo")
    expect(resolveProviderId("sample")).toBe("sample")
    expect(resolveProviderId("SAMPLE")).toBe("sample")
  })

  it("keeps cache keys provider-scoped", () => {
    const request = { symbol: "reliance", assetType: "stock", exchange: "nse", currency: "INR" }
    expect(quoteCacheKey("yahoo", request)).toBe("yahoo:RELIANCE@NSE")
    expect(quoteCacheKey("sample", request)).toBe("sample:RELIANCE@NSE")
  })

  it("honours the configured TTL and defaults", () => {
    const previous = process.env.QUOTE_TTL_SECONDS
    process.env.QUOTE_TTL_SECONDS = "60"
    expect(quoteTtlSeconds("yahoo")).toBe(60)
    delete process.env.QUOTE_TTL_SECONDS
    expect(quoteTtlSeconds("yahoo")).toBe(900)
    expect(quoteTtlSeconds("mfapi")).toBe(21600)
    if (previous !== undefined) process.env.QUOTE_TTL_SECONDS = previous
  })

  it("treats only future expiries as fresh", () => {
    const now = new Date("2026-01-01T10:00:00.000Z")
    expect(isFresh("2026-01-01T10:15:00.000Z", now)).toBe(true)
    expect(isFresh("2026-01-01T09:45:00.000Z", now)).toBe(false)
    expect(isFresh("not-a-date", now)).toBe(false)
  })
})

describe("sample provider", () => {
  it("is deterministic and clearly labelled", () => {
    expect(sampleQuote("TCS")).toEqual(sampleQuote("TCS"))
    expect(sampleQuote("TCS").price).toBeGreaterThan(0)
  })
})

describe("cron authorization", () => {
  it("requires the configured secret", () => {
    const headers = new Headers({ authorization: "Bearer s3cret" })
    expect(isCronAuthorized(headers, "s3cret")).toBe(true)
    expect(isCronAuthorized(headers, "other")).toBe(false)
    expect(isCronAuthorized(new Headers(), "s3cret")).toBe(false)
    expect(isCronAuthorized(headers, undefined)).toBe(false)
    expect(isCronAuthorized(headers, "")).toBe(false)
  })

  it("also accepts the explicit cron header", () => {
    expect(isCronAuthorized(new Headers({ "x-cron-secret": "s3cret" }), "s3cret")).toBe(true)
  })
})
