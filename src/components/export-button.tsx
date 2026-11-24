"use client"
import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
export function ExportButton({ type }: { type: "holdings" | "transactions" }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function download() {
    setBusy(true); setError("")
    try {
      const response = await fetch(`/api/export?type=${type}`)
      if (!response.ok) throw new Error("Export failed. Please retry.")
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement("a")
      link.href = url; link.download = `wealth-${type}-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <div><Button variant="outline" disabled={busy} onClick={download}><Download className="mr-2 h-4 w-4" />{busy ? "Preparing..." : "Export CSV"}</Button>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</div>
}
