import { describe, expect, it } from "vitest"
import { parseFundSearch } from "./mf-search"

describe("fund search parsing", () => {
  it("keeps scheme codes and names", () => {
    const results = parseFundSearch([
      { schemeCode: 120503, schemeName: "Axis ELSS- Tax Saver Fund - Direct Plan - Growth Option" },
      { schemeCode: "112323", schemeName: "Axis ELSS - Regular Plan" },
    ])
    expect(results).toEqual([
      {
        schemeCode: "120503",
        schemeName: "Axis ELSS- Tax Saver Fund - Direct Plan - Growth Option",
      },
      { schemeCode: "112323", schemeName: "Axis ELSS - Regular Plan" },
    ])
  })

  it("drops malformed, duplicate and non-numeric schemes", () => {
    const results = parseFundSearch([
      { schemeCode: 1, schemeName: "One" },
      { schemeCode: 1, schemeName: "Duplicate" },
      { schemeCode: "ABC", schemeName: "Not numeric" },
      { schemeCode: 2, schemeName: "   " },
      { schemeName: "No code" },
      null,
      "nope",
    ])
    expect(results).toEqual([{ schemeCode: "1", schemeName: "One" }])
  })

  it("honours the result limit and rejects non-arrays", () => {
    const payload = Array.from({ length: 20 }, (_, index) => ({
      schemeCode: 1000 + index,
      schemeName: `Fund ${index}`,
    }))
    expect(parseFundSearch(payload, 5)).toHaveLength(5)
    expect(parseFundSearch({})).toEqual([])
    expect(parseFundSearch(null)).toEqual([])
  })
})
