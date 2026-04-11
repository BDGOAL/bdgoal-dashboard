import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/** 全站一致的簡短回饋文案（成功 toast／狀態列） */
export const FEEDBACK_COPY = {
  /** 內容項目儲存並同步後 */
  contentUpdated: "已更新內容",
  /** 新增貼文寫入並同步後 */
  postAdded: "已新增貼文",
  /** 列表 refetch 進行中 */
  listUpdating: "更新清單中…",
  /** 編輯對話框：寫入 API */
  editSaving: "儲存中…",
  /** 編輯對話框：父層同步 / refetch */
  editSyncing: "同步中…",
  /** 新增對話框：POST */
  addSubmitting: "送出中…",
  /** 新增對話框：onAdded / refresh */
  addSyncing: "同步中…",
} as const

type DialogInlineToastProps = {
  type: "success" | "error"
  message: string
  className?: string
}

/** 對話框內右上角短暫狀態（與表單 inline error 並存時，錯誤仍以表內文字為主） */
export function DialogInlineToast({ type, message, className }: DialogInlineToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "absolute right-4 top-4 z-50 rounded-md px-3 py-2 text-xs shadow-md",
        type === "success"
          ? "bg-emerald-600/95 text-white"
          : "bg-red-600/95 text-white",
        className,
      )}
    >
      {message}
    </div>
  )
}

type ListSyncStatusProps = {
  /** 預設為 FEEDBACK_COPY.listUpdating */
  label?: string
  className?: string
}

/** 列表／區塊 refetch 時的輕量狀態（避免畫面靜止無回饋） */
export function ListSyncStatus({ label = FEEDBACK_COPY.listUpdating, className }: ListSyncStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "text-muted-foreground flex min-h-[1.25rem] items-center gap-2 text-xs",
        className,
      )}
    >
      <Loader2 className="text-muted-foreground size-3.5 shrink-0 animate-spin opacity-90" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

type PendingButtonLabelProps = {
  idle: React.ReactNode
  pending: false | string
}

/** 主要按鈕內文 + 可選 spinner（pending 為字串時顯示處理中） */
export function PendingButtonLabel({ idle, pending }: PendingButtonLabelProps) {
  if (!pending) return <>{idle}</>
  return (
    <>
      <Loader2 className="size-3.5 shrink-0 animate-spin opacity-90" aria-hidden />
      <span>{pending}</span>
    </>
  )
}
