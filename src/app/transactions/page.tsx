"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function TransactionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin")
    return null
  }

  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: "buy",
    asset: "",
    quantity: "",
    price: "",
    fee: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })

  const handleSubmit = async () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">Complete transaction history</p>
          </div>
          <Button onClick={() => setOpen(true)}>Add Transaction</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-3 border text-left font-medium text-sm">Type</th>
                    <th className="p-3 border text-left font-medium text-sm">Asset</th>
                    <th className="p-3 border text-left font-medium text-sm">Quantity</th>
                    <th className="p-3 border text-left font-medium text-sm">Price</th>
                    <th className="p-3 border text-left font-medium text-sm">Amount</th>
                    <th className="p-3 border text-left font-medium text-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-3 text-center font-medium text-sm">BUY</td>
                    <td className="p-3 text-sm">HDFC Equity Fund</td>
                    <td className="p-3 text-center font-medium text-sm">1,000</td>
                    <td className="p-3 text-center font-medium text-sm">₹500</td>
                    <td className="p-3 text-center font-medium text-sm">₹50,000</td>
                    <td className="p-3 text-center text-xs text-muted-foreground">Jan 15</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-center font-medium text-sm">DIVIDEND</td>
                    <td className="p-3 text-sm">TCS</td>
                    <td className="p-3 text-center font-medium text-sm">50</td>
                    <td className="p-3 text-center font-medium text-sm">-</td>
                    <td className="p-3 text-center font-medium text-sm">₹750</td>
                    <td className="p-3 text-center text-xs text-muted-foreground">Mar 10</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>Enter the details of your transaction</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="dividend">Dividend</SelectItem>
                    <SelectItem value="interest">Interest</SelectItem>
                    <SelectItem value="sip">SIP</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="asset">Asset</Label>
                <Input id="asset" value={formData.asset} onChange={(e) => setFormData({ ...formData, asset: e.target.value })} placeholder="e.g., Reliance Industries" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" placeholder="Quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} step="0.001" />
                </div>
                <div>
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input id="price" type="number" placeholder="Price per unit" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} step="0.01" />
                </div>
              </div>

              <div>
                <Label htmlFor="fee">Fee (₹)</Label>
                <Input id="fee" type="number" placeholder="Fee" value={formData.fee} onChange={(e) => setFormData({ ...formData, fee: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" placeholder="Additional notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save Transaction</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}