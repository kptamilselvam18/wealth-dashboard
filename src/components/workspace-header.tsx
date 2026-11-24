"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, Bell, Search, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useSummary } from "@/components/summary-provider"

const pages = [
  ["Dashboard", "/dashboard", "Net worth and overview"], ["Portfolio", "/portfolio", "Holdings and investments"],
  ["Transactions", "/transactions", "History, deposits and withdrawals"], ["Analytics", "/analytics", "Performance and returns"],
  ["Goals & planning", "/goals", "Save for your next milestone"], ["Financial health", "/health", "Your financial wellbeing"],
  ["Calculators", "/calculators", "SIP, loans and planning tools"], ["Watchlists & alerts", "/watchlists", "Follow markets and price alerts"],
  ["Debts & liabilities", "/liabilities", "Loans, credit cards and monthly payments"], ["Settings", "/profile", "Profile and appearance"],
]
export function WorkspaceHeader() {
  const pathname = usePathname()
  const { summary } = useSummary()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  useEffect(() => {
    function key(event: KeyboardEvent) { if ((event.ctrlKey || event.metaKey) && event.key === "k") { event.preventDefault(); setOpen(v => !v) } }
    document.addEventListener("keydown", key); return () => document.removeEventListener("keydown", key)
  }, [])
  const current = pages.find(([, href]) => pathname.startsWith(href))
  const matches = pages.filter(p => p.join(" ").toLowerCase().includes(query.toLowerCase()))
  const holdings = query.trim() ? (summary?.holdings ?? []).filter(h => `${h.name} ${h.symbol}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : []
  return <>
    <header className="workspace-header flex h-16 items-center justify-between gap-3 border-b bg-card/80 px-4 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">My workspace</span><span className="hidden sm:inline">/</span><span className="font-medium text-foreground">{current?.[0] ?? "Wealth"}</span></div>
      <div className="flex items-center gap-2"><button onClick={() => { setQuery(""); setOpen(true) }} className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground hover:border-primary/50" aria-label="Search app"><Search className="h-4 w-4" /><span className="hidden md:inline">Search anything...</span><kbd className="hidden rounded border px-1.5 text-[10px] md:inline">Ctrl K</kbd></button><Link href="/watchlists" aria-label="Watchlists and alerts" className="rounded-xl border p-2.5 hover:bg-accent"><Bell className="h-4 w-4" /></Link></div>
    </header>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Find your next step</DialogTitle></DialogHeader><Input aria-label="Search pages and holdings" placeholder="Search pages, tools or holdings..." value={query} onChange={e => setQuery(e.target.value)} /><div className="mt-4 max-h-80 space-y-1 overflow-auto">{matches.map(([name, href, description]) => <Link onClick={() => setOpen(false)} key={href} href={href} className="flex items-center justify-between rounded-xl p-3 hover:bg-accent"><div><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">{description}</p></div><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></Link>)}{holdings.map(h => <Link key={h.id} href="/portfolio" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-3 hover:bg-accent"><Sparkles className="h-4 w-4 text-primary" /><div><p className="text-sm font-medium">{h.name}</p><p className="text-xs text-muted-foreground">Holding · {h.symbol || h.type}</p></div></Link>)}{!matches.length && !holdings.length && <p className="py-8 text-center text-sm text-muted-foreground">No results. Try a page name or asset symbol.</p>}</div></DialogContent></Dialog>
  </>
}
