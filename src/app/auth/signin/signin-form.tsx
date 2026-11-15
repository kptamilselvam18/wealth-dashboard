"use client"

import { useEffect, useState } from "react"
import { getSession, signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard"
  const oauthError = searchParams?.get("error")

  const [mode, setMode] = useState<"signin" | "register">(
    searchParams?.get("mode") === "register" ? "register" : "signin"
  )
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<string[]>([])
  const [callbackUri, setCallbackUri] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCallbackUri(`${window.location.origin}/api/auth/callback/google`)
    let active = true
    fetch("/api/auth/providers")
      .then((response) => (response.ok ? response.json() : {}))
      .then((data: Record<string, unknown>) => {
        if (active) setProviders(Object.keys(data ?? {}))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (oauthError === "OAuthAccountNotLinked") {
      setError(
        "This email already has a password account. Sign in with your password first, or use the same method you originally signed up with."
      )
    }
  }, [oauthError])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error ?? "Could not create your account")
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      // NextAuth answers a rejected sign-in with HTTP 200 and an `error`
      // field, so `result.ok` alone would treat bad credentials as success
      // and bounce off the protected route with no message.
      if (result?.error) {
        throw new Error(
          mode === "register"
            ? "Account created, but sign in failed. Please sign in."
            : "Invalid email or password. If you have not created an account yet, use “Create account” below."
        )
      }

      const session = await getSession()
      if (!session?.user) {
        throw new Error("Sign-in did not complete. Please try again.")
      }

      router.push(callbackUrl)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const googleEnabled = providers.includes("google")

  const copyCallback = async () => {
    try {
      await navigator.clipboard.writeText(callbackUri)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["signin", "register"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value)
              setError(null)
            }}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-all",
              mode === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {value === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {googleEnabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full bg-card text-sm font-medium"
            onClick={() => signIn("google", { callbackUrl })}
          >
            <GoogleMark />
            Continue with Google
          </Button>

          {oauthError && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-semibold">Google sign-in needs one console setting</p>
              <p className="mt-1 leading-relaxed">
                Google rejected the request ({oauthError === "OAuthCallback" ? "redirect_uri_mismatch" : oauthError}).
                Add this exact authorised redirect URI to the Google OAuth client, then try again:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-white/70 px-2 py-1 text-[11px] dark:bg-black/30">
                  {callbackUri}
                </code>
                <button
                  type="button"
                  onClick={copyCallback}
                  className="shrink-0 rounded-md border border-current/20 p-1.5"
                  aria-label="Copy redirect URI"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-medium underline"
              >
                Open Google Cloud credentials <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-background px-2 text-muted-foreground">or use email</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={mode === "register" ? 8 : undefined}
            required
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading
            ? "Please wait..."
            : mode === "register"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "register" ? "Already have an account?" : "New to Wealth?"}{" "}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => {
            setMode(mode === "register" ? "signin" : "register")
            setError(null)
          }}
        >
          {mode === "register" ? "Sign in" : "Create an account"}
        </button>
      </p>

      {googleEnabled && !oauthError && (
        <details className="rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none font-medium">
            Using Google sign-in?
          </summary>
          <p className="mt-2 leading-relaxed">
            The OAuth client must list this exact authorised redirect URI:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-[11px]">
              {callbackUri}
            </code>
            <button
              type="button"
              onClick={copyCallback}
              className="shrink-0 rounded-md border border-border p-1.5"
              aria-label="Copy redirect URI"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Google Cloud credentials <ExternalLink className="h-3 w-3" />
          </a>
        </details>
      )}
    </div>
  )
}
