/** Cron requests must present the configured secret; no secret means no access. */
export function isCronAuthorized(
  headers: Headers,
  secret: string | undefined = process.env.CRON_SECRET
): boolean {
  if (!secret) return false
  if (headers.get("authorization") === `Bearer ${secret}`) return true
  return headers.get("x-cron-secret") === secret
}
