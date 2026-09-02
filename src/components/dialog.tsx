"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div className={`bg-card rounded-lg shadow-xl max-w-md w-full mx-4 ${cn("p-6", "")}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

interface DialogTriggerProps {
  children: ReactNode
}

export function DialogTrigger({ children }: DialogTriggerProps) {
  return <>{children}</>
}

interface DialogContentProps {
  children: ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function DialogContent({ children, className, onOpenChange }: DialogContentProps) {
  return (
    <div className={cn("bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6", className)}>
      <button onClick={() => onOpenChange?.(false)} className="absolute top-4 right-4">
        <span>×</span>
      </button>
      {children}
    </div>
  )
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 mt-4">{children}</div>
}