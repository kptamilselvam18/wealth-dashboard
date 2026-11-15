import * as React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Input({
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={`flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-[inset_0_1px_1px_rgba(15,23,42,0.03)] ring-offset-background transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/80 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      {...props}
    />
  )
}