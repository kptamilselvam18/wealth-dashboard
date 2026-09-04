"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AssetAllocationCard() {
  const allocations = [
    { name: "Equity", value: 45, color: "#2563eb" },
    { name: "Mutual Funds", value: 25, color: "#10b981" },
    { name: "Fixed Income", value: 15, color: "#f59e0b" },
    { name: "Gold", value: 8, color: "#fbbf24" },
    { name: "Silver", value: 2, color: "#9ca3af" },
    { name: "Cash", value: 5, color: "#6b7280" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allocations.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {item.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}