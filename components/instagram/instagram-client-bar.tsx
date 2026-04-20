"use client"

import { ScopeSelector } from "@/components/dashboard/scope-selector"
import { cn } from "@/lib/utils"

export function InstagramClientBar({
  clientName,
  className,
}: {
  clientName: string | null
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 py-1",
        className,
      )}
    >
      <span className="text-foreground min-w-0 truncate text-sm font-medium">
        {clientName ?? "選擇客戶"}
      </span>
      <div className="shrink-0">
        <ScopeSelector />
      </div>
    </div>
  )
}
