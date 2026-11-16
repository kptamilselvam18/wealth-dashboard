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
  const [fundQuery, setFundQuery] = React.useState("")
  const [fundResults, setFundResults] = React.useState<
    { schemeCode: string; schemeName: string }[]
  >([])
  const [fundSearching, setFundSearching] = React.useState(false)
  const [fundError, setFundError] = React.useState<string | null>(null)

  const isCash = assetType === "cash"
  const needsSymbol = assetType === "stock" || assetType === "mutual-fund"

  const reset = () => {
    setName("")
    setSymbol("")
    setQuantity("")
    setPrice("")
    setAmount("")
    setNotes("")
    setDate(today())
    setError(null)
    setFundQuery("")
    setFundResults([])
    setFundError(null)
  }

  const handleFundSearch = async () => {
    const query = fundQuery.trim()
    if (query.length < 2) {
      setFundError("Enter at least 2 characters of the fund name")
      return
    }
    setFundSearching(true)
    setFundError(null)
    setFundResults([])
    try {
      const response = await fetch(`/api/funds/search?q=${encodeURIComponent(query)}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Could not search funds")
      const results = (payload?.results ?? []) as { schemeCode: string; schemeName: string }[]
      setFundResults(results)
      if (results.length === 0) setFundError("No schemes matched — try a shorter name")
    } catch (searchError) {
      setFundError(
        searchError instanceof Error ? searchError.message : "Could not search funds"
      )
    } finally {
      setFundSearching(false)
    }
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
      if (needsSymbol && !payload.symbol) {
        throw new Error(
          assetType === "mutual-fund"
            ? "Enter the numeric fund scheme code (e.g. 120503) so NAV can be fetched"
            : "Enter the exchange ticker (e.g. RELIANCE for NSE) so a live price can be fetched"
        )
      }
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

          {assetType === "mutual-fund" && (
            <div className="space-y-2 rounded-xl border border-border/80 bg-muted/30 p-3">
              <Label htmlFor="fundSearch">Find fund by name</Label>
              <div className="flex gap-2">
                <Input
                  id="fundSearch"
                  value={fundQuery}
                  onChange={(event) => setFundQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleFundSearch()
                    }
                  }}
                  placeholder="e.g., Axis ELSS"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFundSearch}
                  disabled={fundSearching}
                >
                  {fundSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              {fundError && <p className="text-xs text-destructive">{fundError}</p>}
              {fundResults.length > 0 && (
                <ul className="max-h-44 space-y-1 overflow-y-auto">
                  {fundResults.map((result) => (
                    <li key={result.schemeCode}>
                      <button
                        type="button"
                        onClick={() => {
                          setName(result.schemeName.slice(0, 80))
                          setSymbol(result.schemeCode)
                          setFundResults([])
                          setFundError(null)
                        }}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                      >
                        <span className="font-medium">{result.schemeName}</span>
                        <span className="ml-1 text-muted-foreground">{result.schemeCode}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Search MFAPI&apos;s scheme list; choosing a result fills the name and scheme
                code.
              </p>
            </div>
          )}

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
              <Label htmlFor="symbol">
                {assetType === "mutual-fund" ? "Scheme code" : "Symbol / Ticker"}
                {needsSymbol ? " (required for live prices)" : " (optional)"}
              </Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder={
                  assetType === "mutual-fund"
                    ? "e.g., 120503 (MFAPI scheme code)"
                    : "e.g., RELIANCE (NSE) or TCS.BO"
                }
                required={needsSymbol}
              />
              {assetType === "mutual-fund" && (
                <p className="text-[11px] text-muted-foreground">
                  Indian mutual funds need the numeric MFAPI scheme code; a fund name cannot be
                  priced.
                </p>
              )}
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
