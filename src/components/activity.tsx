"use client"

import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import type { TransactionRow } from "@/lib/summary-types"
import { formatCurrency, formatDate } from "@/lib/format"

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "BUY":
    case "SIP":
      return <TrendingUp className="h-4 w-4 text-emerald-600" />
    case "SELL":
      return <TrendingDown className="h-4 w-4 text-red-600" />
    case "DEPOSIT":
      return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
    case "WITHDRAWAL":
      return <ArrowUpRight className="h-4 w-4 text-amber-600" />
    default:
      return <Coins className="h-4 w-4 text-blue-600" />
  }
}

export function RecentActivity({ transactions }: { transactions: TransactionRow[] }) {
  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No transactions yet. Add your first investment to get started.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between border-b py-3 last:border-0"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <TypeIcon type={transaction.type} />
            </span>
            <div>
              <p className="text-sm font-medium">{transaction.name}</p>
              <p className="text-xs text-muted-foreground">
                {transaction.type} · {formatDate(transaction.date)}
              </p>
            </div>
          </div>
          <p className="text-sm font-medium">{formatCurrency(transaction.totalAmount)}</p>
        </div>
      ))}
    </div>
  )
}
