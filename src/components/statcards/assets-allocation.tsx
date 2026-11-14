"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AllocationSlice } from "@/lib/summary-types"
import { formatCurrency } from "@/lib/format"

export function AssetAllocationCard({ allocation }: { allocation: AllocationSlice[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        {allocation.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Add investments to see your allocation.
          </p>
        ) : (
          <div className="space-y-4">
            {allocation.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="w-12 text-right font-medium">
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(item.percent, 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
