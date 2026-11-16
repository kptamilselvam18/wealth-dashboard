import { describe, expect, it } from "vitest"
import {
  isFundType,
  isQuoteableAssetType,
  quoteRequestFor,
  quoteSymbolCandidates,
} from "./portfolio-pricing"

describe("portfolio pricing helpers", () => {
  it("only prices instruments the free providers support", () => {
    expect(isQuoteableAssetType("stock")).toBe(true)
    expect(isQuoteableAssetType("ETF")).toBe(true)
    expect(isQuoteableAssetType("mutual-fund")).toBe(true)
    expect(isQuoteableAssetType("cash")).toBe(false)
    expect(isQuoteableAssetType("fixed-deposit")).toBe(false)
    expect(isQuoteableAssetType("gold")).toBe(false)
  })

  it("detects fund types", () => {
    expect(isFundType("mutual-fund")).toBe(true)
    expect(isFundType("Index Fund")).toBe(true)
    expect(isFundType("stock")).toBe(false)
  })

  it("tries NSE before the bare symbol, but leaves explicit and fund symbols alone", () => {
    expect(quoteSymbolCandidates("reliance")).toEqual(["RELIANCE.NS", "RELIANCE"])
    expect(quoteSymbolCandidates("INFY.BO")).toEqual(["INFY.BO"])
    expect(quoteSymbolCandidates("120503")).toEqual(["120503"])
    expect(quoteSymbolCandidates("   ")).toEqual([])
  })

  it("builds provider requests with the right asset type and exchange", () => {
    expect(quoteRequestFor("RELIANCE.NS", "stock")).toMatchObject({
      symbol: "RELIANCE.NS",
      assetType: "stock",
      exchange: "NSE",
    })
    expect(quoteRequestFor("RELIANCE", "stock").exchange).toBeNull()
    expect(quoteRequestFor("120503", "mutual-fund")).toMatchObject({
      assetType: "mutual-fund",
      exchange: null,
    })
  })
})
