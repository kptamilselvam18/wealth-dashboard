/**
 * Normalise a watchlist symbol for Yahoo Finance.
 * NSE symbols need `.NS`, BSE `.BO`; anything that already carries a suffix or
 * looks like a US ticker is passed through unchanged.
 */
export function yahooSymbol(symbol: string, exchange: string | null): string {
  const cleaned = symbol.trim().toUpperCase()
  if (!cleaned) return cleaned
  if (cleaned.includes(".")) return cleaned
  if (exchange === "NSE") return `${cleaned}.NS`
  if (exchange === "BSE") return `${cleaned}.BO`
  return cleaned
}

/** Reverse of `yahooSymbol`, used for display in provider error messages. */
export function displaySymbol(yahoo: string): string {
  return yahoo.replace(/\.(NS|BO)$/, "")
}

export function isMutualFundSchemeCode(symbol: string): boolean {
  return /^\d{4,8}$/.test(symbol.trim())
}
