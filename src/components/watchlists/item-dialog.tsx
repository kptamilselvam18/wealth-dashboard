"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import type { WatchlistItemView } from "@/lib/watchlists"

const ASSET_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "mutual-fund", label: "Mutual fund" },
  { value: "index", label: "Index" },
]

const EXCHANGES = ["NSE", "BSE", "NASDAQ", "NYSE", "OTHER"]

export function WatchlistItemDialog({
  open,
  onOpenChange,
  watchlistId,
  item,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  watchlistId: string
  item: WatchlistItemView | null
  onSaved: () => void
}) {
  const [symbol, setSymbol] = React.useState("")
  const [name, setName] = React.useState("")
  const [exchange, setExchange] = React.useState("NSE")
  const [assetType, setAssetType] = React.useState("stock")
  const [alertAbove, setAlertAbove] = React.useState("")
  const [alertBelow, setAlertBelow] = React.useState("")
  const [alertChange, setAlertChange] = React.useState("")
  const [manualPrice, setManualPrice] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setSymbol(item?.symbol ?? "")
    setName(item?.name ?? "")
    setExchange(item?.exchange ?? "NSE")
    setAssetType(item?.assetType ?? "stock")
    setAlertAbove(item?.alertAbove ? String(item.alertAbove) : "")
    setAlertBelow(item?.alertBelow ? String(item.alertBelow) : "")
    setAlertChange(item?.alertChangePercent ? String(item.alertChangePercent) : "")
    setManualPrice("")
    setError(null)
  }, [open, item])

  const send = async (payload: Record<string, unknown>, method: "POST" | "PATCH") => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/watchlists/items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not save this item")
      }
      onSaved()
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this item")
    } finally {
      setSaving(false)
    }
  }

  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!symbol.trim() || !name.trim()) {
      setError("Symbol and name are required")
      return
    }

    const payload = {
      watchlistId,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      exchange,
      assetType,
      alertAbove: alertAbove.trim() === "" ? null : Number(alertAbove),
      alertBelow: alertBelow.trim() === "" ? null : Number(alertBelow),
      alertChangePercent: alertChange.trim() === "" ? null : Number(alertChange),
    }

    if (item) {
      await send({ ...payload, id: item.id }, "PATCH")
    } else {
      await send(payload, "POST")
    }
  }

  const updatePrice = async () => {
    if (!item) return
    const price = Number(manualPrice)
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a price greater than 0")
      return
    }
    await send({ id: item.id, manualPrice: price }, "PATCH")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.symbol}` : "Add to watchlist"}</DialogTitle>
          <DialogDescription>
            Track an instrument and set optional in-app alerts. Quotes start as clearly labelled
            demo values until a market-data provider is connected.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={saveDetails} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="watch-symbol">Symbol</Label>
              <Input
                id="watch-symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="e.g., RELIANCE"
                disabled={Boolean(item)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="watch-name">Name</Label>
              <Input
                id="watch-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Reliance Industries"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="watch-exchange">Exchange</Label>
              <Select id="watch-exchange" value={exchange} onValueChange={setExchange}>
                {EXCHANGES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="watch-type">Type</Label>
              <Select id="watch-type" value={assetType} onValueChange={setAssetType}>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alerts
            </p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="watch-above" className="text-xs">
                  Price above (₹)
                </Label>
                <Input
                  id="watch-above"
                  type="number"
                  min="0"
                  step="0.01"
                  value={alertAbove}
                  onChange={(event) => setAlertAbove(event.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="watch-below" className="text-xs">
                  Price below (₹)
                </Label>
                <Input
                  id="watch-below"
                  type="number"
                  min="0"
                  step="0.01"
                  value={alertBelow}
                  onChange={(event) => setAlertBelow(event.target.value)}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="watch-change" className="text-xs">
                  Change ≥ (%)
                </Label>
                <Input
                  id="watch-change"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={alertChange}
                  onChange={(event) => setAlertChange(event.target.value)}
                  placeholder="—"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Alerts appear in-app after a quote refresh or price update. Leave a field empty to
              disable that rule.
            </p>
          </div>

          {item && (
            <div className="space-y-1.5">
              <Label htmlFor="watch-price">Update price manually (₹)</Label>
              <div className="flex gap-2">
                <Input
                  id="watch-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualPrice}
                  onChange={(event) => setManualPrice(event.target.value)}
                  placeholder={item.price ? `Current ${item.price}` : "Enter price"}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void updatePrice()}
                  disabled={saving || manualPrice.trim() === ""}
                >
                  Update price
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : item ? "Save alerts" : "Add to watchlist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
