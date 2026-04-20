"use client"

import * as React from "react"
import { LayoutGrid, CalendarDays } from "lucide-react"

import { cn } from "@/lib/utils"

export type InstagramMainView = "grid" | "calendar"

const options: { value: InstagramMainView; label: string; icon: typeof LayoutGrid }[] =
  [
    { value: "grid", label: "Grid", icon: LayoutGrid },
    { value: "calendar", label: "Calendar", icon: CalendarDays },
  ]

export function InstagramViewSwitcher({
  value,
  onValueChange,
  className,
}: {
  value: InstagramMainView
  onValueChange: (v: InstagramMainView) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="Instagram 檢視模式"
      className={cn(
        "bg-muted/50 inline-flex gap-0.5 rounded-full border border-border/60 p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 opacity-90" aria-hidden />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
