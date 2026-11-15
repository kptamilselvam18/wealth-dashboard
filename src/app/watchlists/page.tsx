"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Bell,
  BellRing,
  CheckCheck,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageError, PageLoading } from "@/components/page-state"
import { WatchlistItemDialog } from "@/components/watchlists/item-dialog"
import { formatCurrency, formatDate } from "@/lib/format"
import {
  alertTypeLabel,
  priceSourceLabel,
  type AlertEventView,
  type WatchlistItemView,
  type WatchlistView,
} from "@/lib/watchlists"
import { cn } from "@/lib/utils"

type WatchlistData = {
  watchlists: WatchlistView[]
  events: AlertEventView[]
  unread: number
  meta: { provider: string }
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span
      className={cn(
        "text-sm font-medium tabular-nums",
        change >= 0 ? "text-emerald-600" : "text-red-600"
      )}
    >
      {change >= 0 ? "+" : ""}
      {change.toFixed(2)}%
    </span>
  )
}

export default function WatchlistsPage() {
  const [data, setData] = useState<WatchlistData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WatchlistItemView | null>(null)
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [listName, setListName] = useState("")
  const [creatingList, setCreatingList] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/watchlists", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load your watchlists")
      const payload = (await response.json()) as WatchlistData
      setData(payload)
      setActiveId((current) => {
        if (current && payload.watchlists.some((list) => list.id === current)) return current
        return payload.watchlists[0]?.id ?? null
      })
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your watchlists")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activeList = data?.watchlists.find((list) => list.id === activeId) ?? null

  const createWatchlist = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!listName.trim()) return
    setCreatingList(true)
    setError(null)
    try {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Could not create the watchlist")
      setListName("")
      setListDialogOpen(false)
      await load()
      if (payload?.watchlist?.id) setActiveId(payload.watchlist.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the watchlist")
    } finally {
      setCreatingList(false)
    }
  }

  const deleteWatchlist = async (list: WatchlistView) => {
    if (!window.confirm(`Delete "${list.name}" and its alerts? This cannot be undone.`)) return
    setError(null)
    try {
      const response = await fetch(`/api/watchlists?id=${list.id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "Could not delete the watchlist")
      }
      if (activeId === list.id) setActiveId(null)
      await load()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the watchlist")
    }
  }

  const removeItem = async (item: WatchlistItemView) => {
    if (!window.confirm(`Remove ${item.symbol} from this watchlist?`)) return
    setError(null)
    try {
      const response = await fetch(`/api/watchlists/items?id=${item.id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? "Could not remove the item")
      }
      await load()
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove the item")
    }
  }

  const refreshQuotes = async () => {
    setRefreshing(true)
    setNotice(null)
    try {
      const response = await fetch("/api/watchlists/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeId ? { watchlistId: activeId } : {}),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Could not refresh quotes")
      await load()
      setNotice(
        `Refreshed ${payload?.updated ?? 0} quote${
          payload?.updated === 1 ? "" : "s"
        } · ${payload?.triggered ?? 0} alert${payload?.triggered === 1 ? "" : "s"} fired · ${
          payload?.unavailable ?? 0
        } unavailable${
          payload?.notified ? ` · ${payload.notified} email sent` : ""
        }`
      )
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh quotes")
    } finally {
      setRefreshing(false)
    }
  }

  const markAllRead = async () => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      await load()
    } catch {
      setError("Could not mark alerts as read")
    }
  }

  if (loading) return <PageLoading label="Loading watchlists..." />

  return (
    <div className="mx-auto max-w-7xl animate-rise px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Star className="h-6 w-6 text-primary" /> Watchlists &amp; Alerts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track instruments and get in-app alerts when your thresholds are crossed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refreshQuotes()} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing ? "animate-spin" : undefined)} />
            {refreshing ? "Refreshing..." : "Refresh quotes"}
          </Button>
          <Button onClick={() => setListDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New watchlist
          </Button>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {data?.meta.provider === "sample" ? (
            <>
              This deployment uses the <strong>sample provider</strong> (MARKET_DATA_PROVIDER=sample),
              so prices are deterministic placeholders, not market data.
            </>
          ) : (
            <>
              Quotes come from <strong>Yahoo Finance</strong> and <strong>MFAPI</strong>, cached for
              about 15 minutes (6 hours for fund NAVs). They can be delayed and are not
              investment-grade — verify before acting. Failed lookups keep the last cached price
              marked as stale, and never invent one.
            </>
          )}
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <PageError message={error} />
        </div>
      )}
      {notice && (
        <p className="mb-4 rounded-xl border border-border bg-card px-3 py-2 text-sm">{notice}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {data && data.watchlists.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {data.watchlists.map((list) => (
                <div
                  key={list.id}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-1 py-1 text-xs",
                    list.id === activeId
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(list.id)}
                    className="rounded-full px-2.5 py-1 font-medium"
                  >
                    {list.name} · {list.items.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteWatchlist(list)}
                    className="rounded-full p-1 hover:bg-background"
                    aria-label={`Delete ${list.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!activeList ? (
            <Card>
              <CardContent className="py-14 text-center">
                <Star className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">No watchlist yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Create a watchlist to follow stocks, ETFs or funds, and set price or percentage
                  alerts.
                </p>
                <Button className="mt-4" onClick={() => setListDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Create a watchlist
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold">{activeList.name}</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingItem(null)
                    setItemDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" /> Add item
                </Button>
              </CardHeader>
              <CardContent>
                {activeList.items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nothing here yet. Add a symbol with optional alerts.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="p-3 font-medium">Instrument</th>
                          <th className="p-3 text-right font-medium">Price</th>
                          <th className="p-3 text-right font-medium">Change</th>
                          <th className="p-3 font-medium">Alerts</th>
                          <th className="p-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {activeList.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0 hover:bg-accent/40">
                            <td className="p-3">
                              <p className="font-medium">{item.symbol}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.name}
                                {item.exchange ? ` · ${item.exchange}` : ""}
                              </p>
                            </td>
                            <td className="p-3 text-right">
                              <p className="font-medium tabular-nums">
                                {item.price === null ? "—" : formatCurrency(item.price)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {priceSourceLabel(item.priceSource)}
                                {item.priceStale ? " · cached" : ""}
                              </p>
                              {item.priceUpdatedAt && (
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(item.priceUpdatedAt).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <ChangeBadge change={item.changePercent} />
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {item.alertAbove !== null && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    Above ₹{item.alertAbove}
                                  </span>
                                )}
                                {item.alertBelow !== null && (
                                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
                                    Below ₹{item.alertBelow}
                                  </span>
                                )}
                                {item.alertChangePercent !== null && (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                    ±{item.alertChangePercent}%
                                  </span>
                                )}
                                {item.alertAbove === null &&
                                  item.alertBelow === null &&
                                  item.alertChangePercent === null && (
                                    <span className="text-xs text-muted-foreground">None</span>
                                  )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingItem(item)
                                    setItemDialogOpen(true)
                                  }}
                                  aria-label={`Edit ${item.symbol}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => void removeItem(item)}
                                  aria-label={`Remove ${item.symbol}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              {data && data.unread > 0 ? (
                <BellRing className="h-4 w-4 text-primary" />
              ) : (
                <Bell className="h-4 w-4 text-muted-foreground" />
              )}
              Alerts
              {data && data.unread > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {data.unread} new
                </span>
              )}
            </CardTitle>
            {data && data.unread > 0 && (
              <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
                <CheckCheck className="h-3.5 w-3.5" /> Mark read
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!data || data.events.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No alerts have fired yet. Add an alert rule and refresh quotes.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.events.map((event) => (
                  <li
                    key={event.id}
                    className={cn(
                      "rounded-xl border p-3 text-sm",
                      event.readAt === null
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/70 bg-card"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {alertTypeLabel(event.type)}
                      </span>
                      {event.readAt === null && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-2 leading-snug">{event.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDate(event.createdAt)} ·{" "}
                      {new Date(event.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>New watchlist</DialogTitle>
            <DialogDescription>
              Group related instruments, for example “Large caps” or “ETFs”.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createWatchlist} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="watchlist-name">Name</Label>
              <Input
                id="watchlist-name"
                value={listName}
                onChange={(event) => setListName(event.target.value)}
                placeholder="e.g., Long-term ideas"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setListDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingList || !listName.trim()}>
                {creatingList ? "Creating..." : "Create watchlist"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {activeList && (
        <WatchlistItemDialog
          open={itemDialogOpen}
          onOpenChange={setItemDialogOpen}
          watchlistId={activeList.id}
          item={editingItem}
          onSaved={() => void load()}
        />
      )}
    </div>
  )
}
