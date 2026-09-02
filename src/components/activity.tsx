"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

export function RecentActivity() {
  const transactions = [
    { type: "BUY", name: "HDFC Equity Fund", amount: 50000, date: "Jan 15" },
    { type: "BUY", name: "Reliance Industries", amount: 30000, date: "Feb 20" },
    { type: "DIVIDEND", name: "TCS", amount: 1500, date: "Mar 10" },
    { type: "DEPOSIT", name: "Savings Account", amount: 25000, date: "Apr 05" },
  ]

  return (
    <div className="space-y-3">
      {transactions.map((t, index) => (
        <div key={index} className="flex items-center justify-between p-2 border-b last:border-0">
          <div className="flex items-center gap-3">
            {t.type === "BUY" ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : t.type === "SELL" ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <span className="h-4 w-4 rounded-full bg-blue-500" />
            )}
            <div>
              <p className="text-sm font-medium">{t.type}</p>
              <p className="text-xs text-muted-foreground">{t.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">₹{t.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t.date}</p>
          </div>
        </div>
      ))}
    </div>
  )
}