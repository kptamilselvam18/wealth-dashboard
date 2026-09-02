"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export function PerformanceChart({ timeRange = "1M", onTimeRangeChange }: { timeRange?: string; onTimeRangeChange?: (val: string) => void }) {
  const ranges = ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"]
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portfolio Performance</CardTitle>
        {onTimeRangeChange && (
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((range) => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-muted-foreground">Performance chart will be displayed here</p>
            <p className="text-sm text-muted-foreground">Select time range to view portfolio performance</p>
          </div>
        </div>
        <div className="flex justify-between mt-4 text-sm">
          <span className="text-muted-foreground">Current: ₹1,00,000</span>
          <span className="text-green-600 font-medium">+12.5%</span>
        </div>
      </CardContent>
    </Card>
  )
}