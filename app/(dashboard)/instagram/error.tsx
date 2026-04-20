"use client"

import { useEffect } from "react"

/** 僅包住 `/instagram` 區段；常見根因為 `content_items` 查詢失敗或尚未套用 migration。 */
export default function InstagramRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[instagram/error]", error.digest ?? error.message, error)
  }, [error])

  return (
    <div className="border-destructive/40 bg-destructive/5 text-destructive space-y-3 rounded-lg border p-4 text-sm">
      <p className="font-medium">Instagram 頁面載入時發生錯誤。</p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {error.message || "請確認已套用 Supabase migration（含 `instagram_order`），或稍後再試。"}
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-[10px] opacity-80">Digest: {error.digest}</p>
      ) : null}
      <button
        type="button"
        className="border-input bg-background hover:bg-accent inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium"
        onClick={() => reset()}
      >
        重試
      </button>
    </div>
  )
}
