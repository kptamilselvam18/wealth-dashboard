"use client"

import { useCallback, useEffect, useState } from "react"
import { CreditCard, Pencil, Plus, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useSummary } from "@/components/summary-provider"
import { PageLoading } from "@/components/page-state"
import { formatCurrency } from "@/lib/format"
import { DEBT_TYPES } from "@/lib/liabilities"

type Debt = { id: string; name: string; type: string; outstandingAmount: number; interestRate: number | null; emi: number | null }
const blank = { name: "", type: "PERSONAL_LOAN", outstandingAmount: "", interestRate: "", emi: "" }
const label = (value: string) => value.toLowerCase().replaceAll("_", " ")

export default function LiabilitiesPage() {
  const { refresh } = useSummary()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState("")
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/liabilities", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load your debts")
      setDebts(await response.json()); setError("")
    } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }, [])
  // Initial loading synchronizes this screen with persisted records.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  function edit(debt?: Debt) {
    setEditing(debt?.id ?? null)
    setForm(debt ? { name: debt.name, type: debt.type, outstandingAmount: String(debt.outstandingAmount), interestRate: debt.interestRate == null ? "" : String(debt.interestRate), emi: debt.emi == null ? "" : String(debt.emi) } : blank)
    setFormError(""); setOpen(true)
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setFormError("")
    try {
      const response = await fetch("/api/liabilities", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editing }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Could not save debt")
      setOpen(false); await Promise.all([load(), refresh()])
    } catch (e) { setFormError((e as Error).message) } finally { setBusy(false) }
  }
  async function remove(debt: Debt) {
    if (!window.confirm(`Remove ${debt.name} from your records? This does not repay or cancel the actual debt.`)) return
    setBusy(true)
    try {
      const response = await fetch(`/api/liabilities?id=${encodeURIComponent(debt.id)}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Could not remove debt")
      await Promise.all([load(), refresh()])
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  if (loading) return <PageLoading label="Loading debts..." />
  const total = debts.reduce((sum, d) => sum + d.outstandingAmount, 0)
  const payment = debts.reduce((sum, d) => sum + (d.emi ?? 0), 0)
  return <div className="mx-auto max-w-7xl animate-rise px-4 py-8">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">YOUR FINANCIAL PICTURE</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Debts & liabilities</h1><p className="mt-2 text-sm text-muted-foreground">Know what you owe. Make room for what comes next.</p></div><Button onClick={() => edit()}><Plus className="mr-2 h-4 w-4" />Add debt</Button></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error} <button onClick={load} className="underline">Retry</button></div>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3">{[["Outstanding balance", formatCurrency(total)], ["Monthly payments", formatCurrency(payment)], ["Active debts", debts.filter(d => d.outstandingAmount > 0).length]].map(([title, value]) => <Card key={title}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p></CardContent></Card>)}</div>
    {!debts.length ? <Card><CardContent className="flex flex-col items-center py-16 text-center"><Wallet className="mb-4 h-10 w-10 text-primary" /><h2 className="text-xl font-semibold">A clear view of what you owe</h2><p className="my-3 max-w-md text-sm text-muted-foreground">Add a home loan, credit card, or other balance. Your net worth updates automatically.</p><Button variant="outline" onClick={() => edit()}>Add your first debt</Button></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{debts.map(debt => <Card key={debt.id}><CardHeader><div className="flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-3 text-primary"><CreditCard className="h-5 w-5" /></span><span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{label(debt.type)}</span></div><CardTitle className="pt-4 text-lg">{debt.name}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold tracking-tight">{formatCurrency(debt.outstandingAmount)}</p><div className="my-5 grid grid-cols-2 gap-4 border-y py-4 text-sm"><div><p className="text-xs text-muted-foreground">Annual interest</p><p className="mt-1">{debt.interestRate == null ? "Not entered" : `${debt.interestRate}%`}</p></div><div><p className="text-xs text-muted-foreground">Monthly payment</p><p className="mt-1">{debt.emi == null ? "Not entered" : formatCurrency(debt.emi)}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={() => edit(debt)} disabled={busy}><Pencil className="mr-2 h-3.5 w-3.5" />Update balance</Button><Button variant="ghost" onClick={() => remove(debt)} disabled={busy} aria-label={`Remove ${debt.name}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></CardContent></Card>)}</div>}
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value) }}><DialogContent><DialogHeader><DialogTitle>{editing ? "Update debt" : "Add a debt"}</DialogTitle><DialogDescription>Track your balance and monthly commitment.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><div><Label htmlFor="debt-name">Name</Label><Input id="debt-name" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Home loan" /></div><div><Label htmlFor="debt-type">Type</Label><Select id="debt-type" value={form.type} onValueChange={type => setForm({ ...form, type })}>{DEBT_TYPES.map(type => <SelectItem key={type} value={type}>{label(type)}</SelectItem>)}</Select></div>{([ ["outstandingAmount", "Outstanding balance (₹)", true], ["interestRate", "Annual interest (%)", false], ["emi", "Monthly payment (₹)", false] ] as const).map(([field, title, required]) => <div key={field}><Label htmlFor={field}>{title}</Label><Input id={field} type="number" min="0" max={field === "interestRate" ? 100 : undefined} step="0.01" required={required} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} /></div>)}{formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}<Button type="submit" disabled={busy} className="w-full">{busy ? "Saving..." : "Save debt"}</Button></form></DialogContent></Dialog>
  </div>
}
