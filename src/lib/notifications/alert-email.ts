import { prisma } from "@/lib/prisma"
import { buildAlertDigest, emailConfig, sendBrevoEmail } from "./email"

export type NotifyResult = {
  sent: number
  skipped: "not-configured" | "opted-out" | "send-failed" | null
}

/**
 * Send one digest for every alert event that has not been emailed yet.
 * Events are marked notified only after the provider accepts the message, so a
 * failure retries on the next refresh instead of losing the alert.
 */
export async function notifyPendingAlerts(userId: string): Promise<NotifyResult> {
  if (!emailConfig()) return { sent: 0, skipped: "not-configured" }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, emailAlerts: true },
  })
  if (!user) return { sent: 0, skipped: null }
  if (!user.emailAlerts) return { sent: 0, skipped: "opted-out" }

  // Only recent events are emailed: if email is enabled later, old alerts should
  // not suddenly arrive, while a provider outage still retries for a day.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const events = await prisma.alertEvent.findMany({
    where: { userId, notifiedAt: null, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { item: { select: { symbol: true } } },
  })
  if (events.length === 0) return { sent: 0, skipped: null }

  const appUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  const digest = buildAlertDigest({
    userName: user.name,
    appUrl,
    events: events.map((event) => ({
      symbol: event.item.symbol,
      message: event.message,
      price: event.price,
      threshold: event.threshold,
      createdAt: event.createdAt,
    })),
  })

  const result = await sendBrevoEmail({
    to: user.email,
    subject: digest.subject,
    text: digest.text,
    html: digest.html,
  })

  if (!result.ok) {
    if (!result.skipped) {
      console.error("Alert email delivery failed:", result.error)
    }
    return { sent: 0, skipped: result.skipped ? "not-configured" : "send-failed" }
  }

  await prisma.alertEvent.updateMany({
    where: { id: { in: events.map((event) => event.id) } },
    data: { notifiedAt: new Date() },
  })

  return { sent: 1, skipped: null }
}
