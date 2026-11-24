import { describe, expect, it } from "vitest"
import { toCsv } from "./csv"
describe("CSV exports", () => {
  it("preserves commas, line breaks, quotes and missing values", () => {
    expect(toCsv([["a,b", 'say "hello"', "a\nb", null]])).toBe('\uFEFF"a,b","say ""hello""","a\nb",""')
  })
  it("neutralizes spreadsheet formulas while preserving numeric losses", () => {
    expect(toCsv([["=HYPERLINK(1)", "  +1", "@SUM(1)", "-2+3", -25]])).toBe('\uFEFF"\'=HYPERLINK(1)","\'  +1","\'@SUM(1)","\'-2+3","-25"')
  })
})
