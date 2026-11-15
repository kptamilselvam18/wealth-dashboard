const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"

export type EmailConfig = {
  apiKey: string
  from: string
  fromName: string
}

/** Email is optional: without a key and a verified sender, nothing is sent. */
export function emailConfig(): EmailConfig | null {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  if (!apiKey || !from) return null
  return {
    apiKey,
    from,
    fromName: process.env.EMAIL_FROM_NAME?.trim() || "Wealth Dashboard",
  }
}

export function isEmailConfigured(): boolean {
  return emailConfig() !== null
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export type AlertDigestEvent = {
  symbol: string
  message: string
  price: number
  threshold: number | null
  createdAt: Date | string
}

function formatPrice(price: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price)
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function buildAlertDigest(input: {
  userName?: string | null
  events: AlertDigestEvent[]
  appUrl?: string
  currency?: string
}): { subject: string; text: string; html: string } {
  const { events, userName, currency = "INR" } = input
  const count = events.length
  const subject =
    count === 1 ? "1 price alert triggered" : `${count} price alerts triggered`

  const lines = events.map((event) => {
    const price = formatPrice(event.price, currency)
    return `- ${event.symbol}: ${event.message} (price ${price}, ${formatDate(event.createdAt)})`
  })

  const appUrl = input.appUrl?.replace(/\/$/, "")
  const greeting = userName?.trim() ? `Hi ${userName.trim()},` : "Hi,"

  const text = [
    greeting,
    "",
    `${count === 1 ? "An alert you set" : `${count} alerts you set`} triggered on your watchlists:`,
    "",
    ...lines,
    "",
    appUrl
      ? `Review them at ${appUrl}/watchlists — quotes may be delayed.`
      : "Review them on your watchlists page — quotes may be delayed.",
    "",
    "You can turn these emails off in Profile → Email alerts.",
  ].join("\n")

  const items = events
    .map(
      (event) =>
        `<li><strong>${escapeHtml(event.symbol)}</strong> — ${escapeHtml(event.message)} ` +
        `<span style="color:#64748b">(${escapeHtml(
          formatPrice(event.price, currency)
        )}, ${escapeHtml(formatDate(event.createdAt))})</span></li>`
    )
    .join("")

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e2e8f0">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e">Wealth Dashboard</p>
    <h1 style="margin:0 0 16px;font-size:20px">${subject}</h1>
    <p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 12px">${
      count === 1 ? "An alert you set" : `${count} alerts you set`
    } triggered on your watchlists:</p>
    <ul style="margin:0 0 16px;padding-left:20px;line-height:1.6">${items}</ul>
    ${
      appUrl
        ? `<p style="margin:0 0 16px"><a href="${escapeHtml(
            `${appUrl}/watchlists`
          )}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none">Review watchlists</a></p>`
        : ""
    }
    <p style="margin:0 0 12px;font-size:12px;color:#64748b">Quotes may be delayed and are not investment advice. Verify before acting.</p>
    <p style="margin:0;font-size:12px;color:#64748b">You can turn these emails off in Profile → Email alerts.</p>
  </div>
</body></html>`

  return { subject, text, html }
}

export type EmailResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped: boolean; error: string }

/** Send through Brevo's transactional API. Never throws and never logs the key. */
export async function sendBrevoEmail(message: {
  to: string
  subject: string
  text: string
  html: string
}): Promise<EmailResult> {
  const config = emailConfig()
  if (!config) {
    return { ok: false, skipped: true, error: "Email provider is not configured" }
  }

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.from, name: config.fromName },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return { ok: false, skipped: false, error: `Brevo responded ${response.status}` }
    }

    const payload = (await response.json().catch(() => null)) as { messageId?: string } | null
    return { ok: true, id: payload?.messageId ?? null }
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : "Email request failed",
    }
  }
}
