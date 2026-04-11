"use client"

import { cn } from "@/lib/utils"

export type ViewModeOption<T extends string = string> = {
  value: T
  label: string
}

type ViewModeToggleProps<T extends string> = {
  value: T
  onValueChange: (value: T) => void
  options: ViewModeOption<T>[]
  className?: string
  /** Accessible label for the tablist. */
  "aria-label"?: string
}

export function ViewModeToggle<T extends string>({
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: ViewModeToggleProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border/60 bg-card/25 p-0.5",
        className,
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            onClick={() => onValueChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
