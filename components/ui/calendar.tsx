"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

// Minimal calendar stub - dates handled via HTML input[type=date]
export function Calendar({ className }: { className?: string }) {
  return <div className={cn("p-3", className)} />
}
