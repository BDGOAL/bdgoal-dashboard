"use client"

import { ScopeSelector } from "@/components/dashboard/scope-selector"
import { cn } from "@/lib/utils"

export function InstagramClientBar({
  clientName,
  className,
}: {
  /** 已選單一客戶時的顯示名稱 */
  clientName: string | null
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card/40 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {clientName ? (
          <p className="text-sm leading-snug">
            <span className="text-muted-foreground text-xs">目前規劃客戶</span>
            <span className="text-foreground ml-2 font-semibold">{clientName}</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm leading-snug">
            Instagram 規劃需指定<strong className="text-foreground font-medium">單一客戶</strong>
            。請選擇客戶後再檢視 Grid／Calendar。
          </p>
        )}
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          與頁首「範圍」共用同一設定；也可在此切換客戶。
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        <span className="text-muted-foreground text-[11px] sm:hidden">切換客戶</span>
        <ScopeSelector />
      </div>
    </div>
  )
}
