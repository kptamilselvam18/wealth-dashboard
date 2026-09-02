"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddInvestmentButton } from "./add-investment"
import { AddTransactionButton } from "./add-transaction"

export function ViewDetailsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedAsset, setSelectedAsset] = useState("")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Investment Details</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Asset</label>
            <select className="w-full mt-1 rounded-md border border-input py-2 px-3">
              <option>Reliance Industries</option>
              <option>HDFC Flexi Cap Fund</option>
              <option>SBI Fixed Deposit</option>
              <option>Gold ETF</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <input type="number" className="w-full mt-1 rounded-md border border-input py-2 px-3" defaultValue="10" />
          </div>
          <div>
            <label className="text-sm font-medium">Average Price</label>
            <input type="number" className="w-full mt-1 rounded-md border border-input py-2 px-3" defaultValue="2850" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button>Save</Button>
          </div>
        </div>
      </div>
    </div>
  )
}