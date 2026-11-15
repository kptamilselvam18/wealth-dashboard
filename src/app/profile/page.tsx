"use client"

import { useEffect, useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import { PageLoading } from "@/components/page-state"
import { useTheme, type Theme } from "@/components/theme-provider"

export default function ProfilePage() {
  const { data: session, status, update } = useSession()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState<string | null>(null)

  useEffect(() => {
    setName(session?.user?.name ?? "")
  }, [session?.user?.name])

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    fetch("/api/profile")
      .then((response) => (response.ok ? response.json() : null))
      .then((user) => {
        if (!cancelled && user && typeof user.emailAlerts === "boolean") {
          setEmailAlerts(user.emailAlerts)
        }
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [status])

  const handleEmailToggle = async (enabled: boolean) => {
    setSavingEmail(true)
    setEmailMessage(null)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAlerts: enabled }),
      })
      if (!response.ok) throw new Error("Could not save your email preference")
      setEmailAlerts(enabled)
      setEmailMessage(enabled ? "Alert emails are on" : "Alert emails are off")
    } catch (error) {
      setEmailMessage(error instanceof Error ? error.message : "Could not save your email preference")
    } finally {
      setSavingEmail(false)
    }
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not save your profile")
      }
      await update({ name: name.trim() })
      setMessage({ type: "success", text: "Profile updated" })
    } catch (saveError) {
      setMessage({
        type: "error",
        text: saveError instanceof Error ? saveError.message : "Could not save your profile",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "This permanently deletes your account, portfolio and transactions. Continue?"
    )
    if (!confirmed) return

    setDeleting(true)
    setMessage(null)
    try {
      const response = await fetch("/api/profile", { method: "DELETE" })
      if (!response.ok) throw new Error("Could not delete your account")
      await signOut({ callbackUrl: "/auth/signin" })
    } catch (deleteError) {
      setMessage({
        type: "error",
        text: deleteError instanceof Error ? deleteError.message : "Could not delete your account",
      })
      setDeleting(false)
    }
  }

  if (status === "loading") return <PageLoading />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  defaultValue={session?.user?.email ?? ""}
                  disabled
                  className="opacity-70"
                />
              </div>
              {message && (
                <p
                  className={`text-sm ${
                    message.type === "success" ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {message.text}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={saving || !name.trim()}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Email alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-teal-700"
                  checked={emailAlerts}
                  disabled={savingEmail}
                  onChange={(event) => handleEmailToggle(event.target.checked)}
                />
                <span>
                  Email me when a watchlist alert fires
                  <span className="mt-1 block text-xs text-muted-foreground">
                    One digest per run, sent to {session?.user?.email}. Delivery depends on the
                    site owner configuring an email provider; the in-app alert list always works.
                  </span>
                </span>
              </label>
              {emailMessage && <p className="text-xs text-muted-foreground">{emailMessage}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Label htmlFor="theme">Theme</Label>
              <Select
                id="theme"
                value={theme}
                onValueChange={(value) => setTheme(value as Theme)}
              >
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </Select>
              <p className="pt-2 text-xs text-muted-foreground">
                Your theme is stored in this browser.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-destructive">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              >
                Sign Out
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
