export type FundSearchResult = {
  schemeCode: string
  schemeName: string
}

const SEARCH_LIMIT = 8

/** MFAPI returns `{ schemeCode: number, schemeName: string }[]`. */
export function parseFundSearch(payload: unknown, limit = SEARCH_LIMIT): FundSearchResult[] {
  if (!Array.isArray(payload)) return []
  const seen = new Set<string>()
  const results: FundSearchResult[] = []

  for (const entry of payload) {
    if (!entry || typeof entry !== "object") continue
    const code = (entry as { schemeCode?: unknown }).schemeCode
    const name = (entry as { schemeName?: unknown }).schemeName
    const schemeCode = typeof code === "number" || typeof code === "string" ? String(code).trim() : ""
    const schemeName = typeof name === "string" ? name.trim() : ""
    if (!/^\d+$/.test(schemeCode) || !schemeName || seen.has(schemeCode)) continue
    seen.add(schemeCode)
    results.push({ schemeCode, schemeName })
    if (results.length >= limit) break
  }

  return results
}

/**
 * Search Indian mutual fund schemes by name. Returns `null` when MFAPI is
 * unreachable so callers can distinguish an outage from "no matches".
 */
export async function searchMutualFunds(query: string): Promise<FundSearchResult[] | null> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  if (trimmed.length > 80) return []

  try {
    const response = await fetch(
      `https://api.mfapi.in/mf/search?q=${encodeURIComponent(trimmed)}`,
      {
        signal: AbortSignal.timeout(8_000),
        next: { revalidate: 86_400 },
      }
    )
    if (!response.ok) {
      console.error("Fund search failed:", response.status)
      return null
    }
    return parseFundSearch(await response.json())
  } catch (error) {
    console.error("Fund search failed:", error)
    return null
  }
}
