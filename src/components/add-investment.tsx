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

const ASSET_TYPES = [
  { value: "stock", label: "Indian Stock" },
  { value: "mutual-fund", label: "Mutual Fund" },
  { value: "fixed-deposit", label: "Fixed Deposit" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "cash", label: "Cash / Bank Balance" },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function AddInvestmentButton() {
  const { refresh } = useSummary()
  const [open, setOpen] = React.useState(false)
  const [assetType, setAssetType] = React.useState("stock")
  const [name, setName] = React.useState("")
  const [symbol, setSymbol] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState(today())
  const [notes, setNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const isCash = assetType === "cash"

  const reset = () => {
    setName("")
    setSymbol("")
    setQuantity("")
    setPrice("")
    setAmount("")
    setNotes("")
    setDate(today())
    setError(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const payload = {
        assetType,
        name: name.trim(),
        symbol: symbol.trim(),
        quantity: isCash ? Number(amount) : Number(quantity),
        price: isCash ? 1 : Number(price),
        date,
        notes: notes.trim(),
      }

      if (!payload.name) throw new Error("Enter a name for this asset")
      if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
        throw new Error(isCash ? "Enter the cash amount" : "Quantity must be greater than 0")
      }
      if (!isCash && (!Number.isFinite(payload.price) || payload.price < 0)) {
        throw new Error("Enter a valid price per unit")
      }

      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not add this investment")
      }

      await refresh()
      setOpen(false)
      reset()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not add this investment"
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
        <Button type="button">Add Investment</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Investment</DialogTitle>
          <DialogDescription>Record a purchase in your portfolio</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assetType">Asset Type</Label>
            <Select id="assetType" value={assetType} onValueChange={setAssetType}>
              {ASSET_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">{isCash ? "Account Name" : "Name"}</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isCash ? "e.g., HDFC Savings" : "e.g., Reliance Industries"}
              required
            />
          </div>

          {!isCash && (
            <div className="space-y-1.5">
              <Label htmlFor="symbol">Symbol / Ticker (optional)</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="e.g., RELIANCE"
              />
            </div>
          )}

          {isCash ? (
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g., 50000"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
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
                <Label htmlFor="price">Price per Unit (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="date">{isCash ? "As of" : "Purchase Date"}</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Any additional notes"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Investment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
