"use client"

import { useCallback, useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { ExportButton } from "@/components/export-button"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageError, PageLoading } from "@/components/page-state"
import { useSummary } from "@/components/summary-provider"
import { AddTransactionButton } from "@/components/add-transaction"
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format"
import type { TransactionRow } from "@/lib/summary-types"

type TransactionItem = TransactionRow & {
  assetId: string
  assetType: string
}

function typeClass(type: string) {
  if (type === "BUY" || type === "SIP") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
  }
  if (type === "SELL" || type === "WITHDRAWAL") {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
  }
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
}

export default function TransactionsPage() {
  const { refresh } = useSummary()
  const [transactions, setTransactions] = useState<TransactionItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [type, setType] = useState("ALL")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const filtered = (transactions ?? []).filter(t => (!query || `${t.name} ${t.symbol ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(query.toLowerCase())) && (type === "ALL" || t.type === type) && (!from || t.date.slice(0,10) >= from) && (!to || t.date.slice(0,10) <= to))

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/transactions", { cache: "no-store" })
      if (!response.ok) throw new Error("Could not load your transactions")
      const data = (await response.json()) as TransactionItem[]
      setTransactions(data)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your transactions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial synchronization with the server's transaction records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transaction? The holding quantity will be adjusted.")) {
      return
    }
    setDeletingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? "Could not delete this transaction")
      }
      await Promise.all([load(), refresh()])
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete this transaction"
      )
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <PageLoading label="Loading transactions..." />

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Complete transaction history</p>
        </div>
        <div className="flex flex-wrap gap-2"><ExportButton type="transactions" /><AddTransactionButton onCreated={load} /></div>
      </div>

      {error && (
        <div className="mb-4">
          <PageError message={error} />
        </div>
      )}

      <Card>
        <div className="grid gap-3 border-b p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Input aria-label="Search transactions" placeholder="Search asset or notes..." value={query} onChange={e => setQuery(e.target.value)} />
          <Select aria-label="Transaction type" value={type} onValueChange={setType}><SelectItem value="ALL">All types</SelectItem>{["BUY", "SELL", "SIP", "DEPOSIT", "WITHDRAWAL", "DIVIDEND", "INTEREST", "OTHER"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</Select>
          <Input aria-label="From date" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input aria-label="To date" type="date" min={from || undefined} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {filtered.length} matching transaction{filtered.length === 1 ? "" : "s"} · latest 200 records. CSV includes all records.
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No matching transactions. Adjust your filters or add a transaction.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="p-3 text-left font-medium">Date</th>
                    <th className="p-3 text-left font-medium">Type</th>
                    <th className="p-3 text-left font-medium">Asset</th>
                    <th className="p-3 text-right font-medium">Qty</th>
                    <th className="p-3 text-right font-medium">Price</th>
                    <th className="p-3 text-right font-medium">Amount</th>
                    <th className="p-3 text-left font-medium">Notes</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b transition-colors hover:bg-accent/50"
                    >
                      <td className="whitespace-nowrap p-3 text-muted-foreground">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeClass(
                            transaction.type
                          )}`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{transaction.name}</div>
                        {transaction.symbol && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.symbol}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatQuantity(transaction.quantity)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(transaction.price)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(transaction.totalAmount)}
                      </td>
                      <td className="max-w-[220px] truncate p-3 text-xs text-muted-foreground">
                        {transaction.notes || "—"}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deletingId === transaction.id}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
