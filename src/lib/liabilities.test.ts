import { describe, expect, it } from "vitest"
import { parseLiability } from "./liabilities"
const debt = { name: " Home loan ", type: "HOME_LOAN", outstandingAmount: "2400000", interestRate: "8.5", emi: "24000" }
describe("liability validation", () => {
  it("normalizes input and allows paid-off debts", () => {
    expect(parseLiability(debt)).toEqual({ name: "Home loan", type: "HOME_LOAN", outstandingAmount: 2400000, interestRate: 8.5, emi: 24000 })
    expect(parseLiability({ ...debt, outstandingAmount: 0, emi: "", interestRate: "" })).toMatchObject({ outstandingAmount: 0, emi: null, interestRate: null })
  })
  it.each([NaN, Infinity, -1, "", null])("rejects invalid balances: %s", outstandingAmount => {
    expect(() => parseLiability({ ...debt, outstandingAmount })).toThrow()
  })
  it("rejects unsupported types and unreasonable rates", () => {
    expect(() => parseLiability({ ...debt, type: "UNKNOWN" })).toThrow()
    expect(() => parseLiability({ ...debt, interestRate: 101 })).toThrow()
    expect(() => parseLiability({ ...debt, emi: -10 })).toThrow()
  })
})
