import { round } from "./core"

/**
 * Indian equity capital gains (post 23 July 2024 regime):
 * - Short term (<= 12 months): 20%
 * - Long term (> 12 months): 12.5% above ₹1,25,000 annual exemption
 * These rates change with tax law; always show the disclaimer in the UI.
 */
export const EQUITY_STCG_RATE = 20
export const EQUITY_LTCG_RATE = 12.5
export const EQUITY_LTCG_EXEMPTION = 125_000

export function equityCapitalGains({
  buyPrice,
  sellPrice,
  quantity,
  holdingMonths,
}: {
  buyPrice: number
  sellPrice: number
  quantity: number
  holdingMonths: number
}) {
  const cost = buyPrice * quantity
  const proceeds = sellPrice * quantity
  const gain = proceeds - cost
  const isLongTerm = holdingMonths > 12

  let exemptionUsed = 0
  let taxableGain = 0
  let tax = 0

  if (gain > 0) {
    if (isLongTerm) {
      exemptionUsed = Math.min(gain, EQUITY_LTCG_EXEMPTION)
      taxableGain = gain - exemptionUsed
      tax = taxableGain * (EQUITY_LTCG_RATE / 100)
    } else {
      taxableGain = gain
      tax = gain * (EQUITY_STCG_RATE / 100)
    }
  }

  return {
    cost: round(cost),
    proceeds: round(proceeds),
    gain: round(gain),
    type: isLongTerm ? ("LTCG" as const) : ("STCG" as const),
    exemptionUsed: round(exemptionUsed),
    taxableGain: round(taxableGain),
    tax: round(tax),
    netGain: round(gain - tax),
    effectiveRate: gain > 0 ? round((tax / gain) * 100, 2) : 0,
  }
}

/** Total drag of an expense ratio on a long-term investment. */
export function expenseRatioImpact({
  principal,
  grossReturn,
  expenseRatio,
  years,
}: {
  principal: number
  grossReturn: number
  expenseRatio: number
  years: number
}) {
  const netReturn = grossReturn - expenseRatio
  const withoutCost = principal * (1 + grossReturn / 100) ** years
  const withCost = principal * (1 + netReturn / 100) ** years
  const series = Array.from({ length: Math.max(0, Math.floor(years)) }, (_, index) => {
    const year = index + 1
    return {
      year,
      withoutCost: round(principal * (1 + grossReturn / 100) ** year),
      withCost: round(principal * (1 + netReturn / 100) ** year),
    }
  })

  return {
    withoutCost: round(withoutCost),
    withCost: round(withCost),
    cost: round(withoutCost - withCost),
    costPercentOfGain: withoutCost > principal ? round(((withoutCost - withCost) / (withoutCost - principal)) * 100, 1) : 0,
    netReturn: round(netReturn, 2),
    series,
  }
}

/** Post-tax return on a debt investment taxed at slab rate. */
export function postTaxReturn({
  principal,
  annualReturn,
  years,
  taxSlab,
}: {
  principal: number
  annualReturn: number
  years: number
  taxSlab: number
}) {
  const preTax = principal * (1 + annualReturn / 100) ** years
  const gain = preTax - principal
  const tax = gain * (taxSlab / 100)
  const postTax = preTax - tax

  return {
    preTaxValue: round(preTax),
    postTaxValue: round(postTax),
    tax: round(tax),
    preTaxCagr: round(annualReturn, 2),
    postTaxCagr:
      principal > 0 && years > 0
        ? round(((postTax / principal) ** (1 / years) - 1) * 100, 2)
        : 0,
  }
}
