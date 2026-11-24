"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const titleId = React.useId()
  const changeRef = React.useRef(onOpenChange)
  React.useEffect(() => { changeRef.current = onOpenChange }, [onOpenChange])
  const setOpen = React.useCallback((next: boolean) => changeRef.current(next), [])
  const value = React.useMemo(
    () => ({ open, setOpen, titleId }),
    [open, setOpen, titleId]
  )
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  const context = React.useContext(DialogContext)
  if (!context) return <>{children}</>
  return (
    <span className="contents" onClick={() => context.setOpen(true)}>
      {children}
    </span>
  )
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const context = React.useContext(DialogContext)
  const open = Boolean(context?.open)
  const mounted = React.useSyncExternalStore(() => () => {}, () => true, () => false)
  const panel = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open || !context) return
    const previousFocus = document.activeElement as HTMLElement | null
    const focusFrame = requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button, a[href], [tabindex="0"]')
      ;(first ?? panel.current)?.focus()
    })
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") context.setOpen(false)
      if (event.key === "Tab") {
        const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(item => item.getClientRects().length)
        const first = items[0], last = items[items.length - 1]
        if (!first) { event.preventDefault(); panel.current?.focus(); return }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
      cancelAnimationFrame(focusFrame)
      previousFocus?.focus()
    }
  }, [open, context])

  if (!mounted || !context?.open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => context.setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={context.titleId}
        ref={panel}
        tabIndex={-1}
        className={cn(
          "relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border bg-card p-6 shadow-xl",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => context.setOpen(false)}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>, document.body
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 pr-6">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  const context = React.useContext(DialogContext)
  return <h3 id={context?.titleId} className="text-lg font-semibold">{children}</h3>
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-muted-foreground">{children}</p>
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>
}
