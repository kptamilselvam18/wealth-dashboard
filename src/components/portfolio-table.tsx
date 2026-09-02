"use client"

export function PortfolioTable() {
  const holdings = [
    { name: "Reliance Industries", symbol: "RELIANCE", type: "Stock", qty: 10, avgPrice: 2500, currPrice: 2850, invested: 25000, value: 28500, pnl: 3500, return: 14.0 },
    { name: "HDFC Flexi Cap Fund", symbol: "HDFCFLEXI", type: "Mutual Fund", qty: 500, avgPrice: 550, currPrice: 652, invested: 275000, value: 326000, pnl: 51000, return: 18.5 },
    { name: "SBI Fixed Deposit", symbol: "SBI-FD", type: "Fixed Deposit", qty: 1, avgPrice: 100000, currPrice: 106800, invested: 100000, value: 106800, pnl: 6800, return: 6.8 },
    { name: "Gold ETF", symbol: "GOLD", type: "Gold", qty: 20, avgPrice: 65000, currPrice: 72500, invested: 1300000, value: 1450000, pnl: 150000, return: 11.5 },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left font-medium text-sm">Asset</th>
            <th className="p-3 text-center font-medium text-sm">Type</th>
            <th className="p-3 text-center font-medium text-sm">Qty</th>
            <th className="p-3 text-right font-medium text-sm">Avg Price</th>
            <th className="p-3 text-right font-medium text-sm">Curr Price</th>
            <th className="p-3 text-right font-medium text-sm">Invested</th>
            <th className="p-3 text-right font-medium text-sm">Current</th>
            <th className="p-3 text-right font-medium text-sm">P&L</th>
            <th className="p-3 text-right font-medium text-sm">Return</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, index) => (
            <tr key={index} className="border-b hover:bg-accent/50">
              <td className="p-3">
                <div className="font-medium">{h.name}</div>
                <div className="text-xs text-muted-foreground">{h.symbol}</div>
              </td>
              <td className="p-3 text-center text-sm">{h.type}</td>
              <td className="p-3 text-center font-mono text-sm">{h.qty}</td>
              <td className="p-3 text-right font-mono text-sm">₹{h.avgPrice.toLocaleString()}</td>
              <td className="p-3 text-right font-mono text-sm">₹{h.currPrice.toLocaleString()}</td>
              <td className="p-3 text-right text-sm">₹{h.invested.toLocaleString()}</td>
              <td className="p-3 text-right font-mono text-sm">₹{h.value.toLocaleString()}</td>
              <td className="p-3 text-right font-mono text-sm">
                <span className={h.pnl >= 0 ? "text-green-600" : "text-red-600"}>
                  {h.pnl >= 0 ? "+" : ""}₹{h.pnl.toLocaleString()}
                </span>
              </td>
              <td className="p-3 text-right font-mono text-sm">
                <span className={h.return >= 0 ? "text-green-600" : "text-red-600"}>
                  {h.return >= 0 ? "+" : ""}{h.return}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}