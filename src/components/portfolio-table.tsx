"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSummary } from "@/components/summary-provider"
import type { HoldingRow } from "@/lib/summary-types"
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format"
import { priceSourceLabel } from "@/lib/watchlists"

export function PortfolioTable({ holdings }: { holdings: HoldingRow[] }) {
  const { refresh } = useSummary()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<HoldingRow | null>(null)
  const [quantity, setQuantity] = useState("")
  const [averagePrice, setAveragePrice] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setSaveError("")
    try {
      const response = await fetch("/api/assets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing?.id, quantity: Number(quantity), averagePrice: Number(averagePrice) }) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Could not update holding") }
      setEditing(null); await refresh()
    } catch (e) { setSaveError((e as Error).message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this holding from your portfolio?")) return
    setDeletingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/assets?id=${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Could not remove this holding")
      await refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove this holding")
    } finally {
      setDeletingId(null)
    }
  }

  if (holdings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No holdings to display. Add an investment or adjust your search and filters.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3 text-left font-medium">Asset</th>
              <th className="p-3 text-center font-medium">Type</th>
              <th className="p-3 text-right font-medium">Qty</th>
              <th className="p-3 text-right font-medium">Avg Price</th>
              <th className="p-3 text-right font-medium">Current</th>
              <th className="p-3 text-right font-medium">Invested</th>
              <th className="p-3 text-right font-medium">Value</th>
              <th className="p-3 text-right font-medium">P&amp;L</th>
              <th className="p-3 text-right font-medium">Return</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={holding.id} className="border-b transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <div className="font-medium">{holding.name}</div>
                  {holding.symbol && (
                    <div className="text-xs text-muted-foreground">{holding.symbol}</div>
                  )}
                </td>
                <td className="p-3 text-center text-muted-foreground">{holding.type}</td>
                <td className="p-3 text-right font-mono">{formatQuantity(holding.quantity)}</td>
                <td className="p-3 text-right font-mono">{formatCurrency(holding.averagePrice)}</td>
                <td className="p-3 text-right font-mono">
                  {formatCurrency(holding.currentPrice)}
                  {holding.type !== "Cash" && (
                    <div className="font-sans text-[10px] font-normal text-muted-foreground">
                      {holding.priceSource
                        ? priceSourceLabel(holding.priceSource)
                        : "No market price"}
                      {holding.priceSource && holding.priceAsOf
                        ? ` · ${new Date(holding.priceAsOf).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}`
                        : ""}
                    </div>
                  )}
                </td>
                <td className="p-3 text-right">{formatCurrency(holding.invested)}</td>
                <td className="p-3 text-right font-mono">{formatCurrency(holding.currentValue)}</td>
                <td
                  className={`p-3 text-right font-mono ${
                    holding.pnl >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {holding.pnl >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(holding.pnl))}
                </td>
                <td
                  className={`p-3 text-right font-mono ${
                    holding.returnPercent >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {holding.type === "Cash" ? "—" : formatPercent(holding.returnPercent)}
                </td>
                <td className="p-3 text-right">
                  <button type="button" aria-label={`Edit ${holding.name}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={() => { setEditing(holding); setQuantity(String(holding.quantity)); setAveragePrice(String(holding.averagePrice)); setSaveError("") }}><Pencil className="h-4 w-4" /></button>
                  <button
                    type="button"
                    onClick={() => handleDelete(holding.id)}
                    disabled={deletingId === holding.id}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label={`Remove ${holding.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={Boolean(editing)} onOpenChange={value => { if (!value && !saving) setEditing(null) }}><DialogContent><DialogHeader><DialogTitle>Correct holding</DialogTitle><DialogDescription>{editing?.name}. This corrects your recorded balance without changing past transactions. Record a transaction for new purchases or sales.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><div><Label htmlFor="edit-quantity">Quantity</Label><Input id="edit-quantity" type="number" min="0.000001" step="any" required value={quantity} onChange={e => setQuantity(e.target.value)} /></div><div><Label htmlFor="edit-average">Average cost per unit (₹)</Label><Input id="edit-average" type="number" min="0" step="any" required value={averagePrice} onChange={e => setAveragePrice(e.target.value)} /></div>{saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}<Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : "Save correction"}</Button></form></DialogContent></Dialog>
    </div>
  )
}
