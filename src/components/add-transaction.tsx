"use client"

import * as React from "react"
import {
  Dialog,
  DialogTrigger,
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
import { useSummary } from "@/components/summary-provider"
import type { AssetOption } from "@/lib/summary-types"

const INVESTMENT_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "sip", label: "SIP" },
  { value: "dividend", label: "Dividend" },
  { value: "interest", label: "Interest" },
]

const CASH_TYPES = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function AddTransactionButton({ onCreated }: { onCreated?: () => void }) {
  const { refresh } = useSummary()
  const [open, setOpen] = React.useState(false)
  const [assets, setAssets] = React.useState<AssetOption[]>([])
  const [assetId, setAssetId] = React.useState("")
  const [type, setType] = React.useState("buy")
  const [quantity, setQuantity] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [fee, setFee] = React.useState("")
  const [date, setDate] = React.useState(today())
  const [notes, setNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let active = true

    fetch("/api/assets", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: AssetOption[]) => {
        if (!active) return
        setAssets(data)
        setAssetId((current) => current || data[0]?.id || "")
      })
      .catch(() => {
        if (active) setError("Could not load your assets")
      })

    return () => {
      active = false
    }
  }, [open])

  const selectedAsset = assets.find((asset) => asset.id === assetId)
  const isCash = selectedAsset?.type === "cash"
  const typeOptions = isCash ? CASH_TYPES : INVESTMENT_TYPES

  React.useEffect(() => {
    setType(isCash ? "deposit" : "buy")
  }, [isCash])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!assetId) throw new Error("Select an asset first")

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          type,
          quantity: Number(quantity || 0),
          price: Number(price || 0),
          fee: Number(fee || 0),
          date,
          notes: notes.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not save this transaction")
      }

      await refresh()
      onCreated?.()
      setOpen(false)
      setQuantity("")
      setPrice("")
      setFee("")
      setNotes("")
      setDate(today())
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save this transaction"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <DialogTrigger>
        <Button type="button" variant="outline">
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a buy, sell, income or cash movement
          </DialogDescription>
        </DialogHeader>

        {assets.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            You need at least one asset before recording a transaction. Add an
            investment first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="assetId">Asset</Label>
              <Select id="assetId" value={assetId} onValueChange={setAssetId}>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                    {asset.symbol ? ` (${asset.symbol})` : ""}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select id="type" value={type} onValueChange={setType}>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">
                  {isCash ? "Amount (₹)" : "Quantity"}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">{isCash ? "Price" : "Price per Unit (₹)"}</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  disabled={isCash}
                  placeholder={isCash ? "1" : undefined}
                  required={!isCash}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fee">Fee (₹)</Label>
                <Input
                  id="fee"
                  type="number"
                  min="0"
                  value={fee}
                  onChange={(event) => setFee(event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Additional notes"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
