"use client"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PageLoading({ label = "Loading your portfolio..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  )
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>Try again</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
