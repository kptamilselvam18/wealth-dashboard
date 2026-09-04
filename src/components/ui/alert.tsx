"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Label({ htmlFor, children, className }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium", className)}>
      {children}
    </label>
  )
}

interface AlertProps {
  variant?: "default" | "destructive" | "success"
  className?: string
  children: React.ReactNode
}

export function Alert({ variant = "default", className, children }: AlertProps) {
  const variantClasses = {
    default: "bg-card text-card-foreground",
    destructive: "bg-destructive/10 border-destructive/50 text-destructive",
    success: "bg-primary/10 border-primary/50 text-primary",
  }
  
  return (
    <div 
      role="alert" 
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-start">
        {children}
      </div>
    </div>
  )
}

export function AlertTitle({ children }: { children: React.ReactNode }) {
  return <h5 className="font-medium">{children}</h5>
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}