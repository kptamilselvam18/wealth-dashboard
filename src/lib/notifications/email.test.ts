import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildAlertDigest,
  emailConfig,
  escapeHtml,
  sendBrevoEmail,
} from "./email"

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env.BREVO_API_KEY = "xkeysib-test"
  process.env.EMAIL_FROM = "alerts@example.com"
  process.env.EMAIL_FROM_NAME = "Wealth Dashboard"
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const digestInput = {
  userName: "Asha",
  appUrl: "https://wealth.example.com",
  events: [
    {
      symbol: "RELIANCE",
      message: "crossed above ₹2,000",
      price: 2034.5,
      threshold: 2000,
      createdAt: "2026-11-15T03:30:00.000Z",
    },
  ],
}

describe("email configuration", () => {
  it("requires both an API key and a sender", () => {
    expect(emailConfig()?.from).toBe("alerts@example.com")
    delete process.env.BREVO_API_KEY
    expect(emailConfig()).toBeNull()
    expect(emailConfig).not.toThrow()
  })
})

describe("alert digest", () => {
  it("summarises the count and includes each alert", () => {
    const digest = buildAlertDigest(digestInput)
    expect(digest.subject).toBe("1 price alert triggered")
    expect(digest.text).toContain("Hi Asha,")
    expect(digest.text).toContain("RELIANCE")
    expect(digest.text).toContain("crossed above ₹2,000")
    expect(digest.text).toContain("https://wealth.example.com/watchlists")
    expect(digest.text).toContain("Profile → Email alerts")
  })

  it("pluralises for multiple alerts", () => {
    const digest = buildAlertDigest({
      events: [
        ...digestInput.events,
        {
          symbol: "INFY",
          message: "crossed below ₹1,100",
          price: 1085,
          threshold: 1100,
          createdAt: "2026-11-15T03:31:00.000Z",
        },
      ],
    })
    expect(digest.subject).toBe("2 price alerts triggered")
  })

  it("escapes user-visible content in HTML", () => {
    const digest = buildAlertDigest({
      userName: '<script>alert("x")</script>',
      events: [
        {
          symbol: "A&B",
          message: '<img src=x onerror="alert(1)">',
          price: 10,
          threshold: null,
          createdAt: "2026-11-15T03:30:00.000Z",
        },
      ],
    })
    expect(digest.html).not.toContain("<script>")
    expect(digest.html).not.toContain("<img src=x")
    expect(digest.html).toContain("A&amp;B")
    expect(escapeHtml(`"'&<>`)).toBe("&quot;&#39;&amp;&lt;&gt;")
  })
})

describe("Brevo sending", () => {
  it("does nothing without configuration", async () => {
    delete process.env.BREVO_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const result = await sendBrevoEmail({
      to: "user@example.com",
      subject: "s",
      text: "t",
      html: "<p>t</p>",
    })
    expect(result).toEqual({ ok: false, skipped: true, error: "Email provider is not configured" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts the message with the API key header", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ messageId: "abc" }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)
    const digest = buildAlertDigest(digestInput)
    const result = await sendBrevoEmail({ to: "user@example.com", ...digest })

    expect(result).toEqual({ ok: true, id: "abc" })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://api.brevo.com/v3/smtp/email")
    expect((init.headers as Record<string, string>)["api-key"]).toBe("xkeysib-test")
    const body = JSON.parse(String(init.body))
    expect(body.to).toEqual([{ email: "user@example.com" }])
    expect(body.sender.email).toBe("alerts@example.com")
    expect(body.subject).toBe("1 price alert triggered")
    expect(body.htmlContent).toContain("RELIANCE")
  })

  it("reports provider failures without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad key", { status: 401 })))
    const result = await sendBrevoEmail({ to: "u@example.com", subject: "s", text: "t", html: "<p>t</p>" })
    expect(result).toEqual({ ok: false, skipped: false, error: "Brevo responded 401" })
  })

  it("reports network failures without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout") }))
    const result = await sendBrevoEmail({ to: "u@example.com", subject: "s", text: "t", html: "<p>t</p>" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.skipped).toBe(false)
  })
})
