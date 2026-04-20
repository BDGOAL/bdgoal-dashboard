"use client"

import * as React from "react"
import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ContentItem } from "@/lib/types/dashboard"
import {
  applyScheduledAtChangeRule,
  applyStatusChangeRule,
  toPlannedPublishDateIso,
  validateStatusAndScheduledAt,
  type ContentWorkflowStatus,
} from "@/components/instagram/status-schedule-rules"
import {
  getInstagramDisplayStatus,
  instagramDisplayStatusLabel,
} from "@/lib/instagram/instagram-display-status"
import { getInstagramPrimaryImageUrl } from "@/lib/instagram/instagram-media"
import { isInstagramPersistableItem } from "@/lib/instagram/instagram-ui-persistence"
import {
  DialogInlineToast,
  FEEDBACK_COPY,
  PendingButtonLabel,
} from "@/components/dashboard/async-feedback"

function contentItemToWorkflow(item: ContentItem): ContentWorkflowStatus {
  if (item.status === "published") return "published"
  if (item.status === "scheduled") return "scheduled"
  return "planning"
}

function formatDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    return new Date(iso).toISOString().slice(0, 16)
  } catch {
    return ""
  }
}

type Props = {
  item: ContentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  onRequestFullEdit: (item: ContentItem) => void
}

type ToastState = { message: string } | null

export function InstagramPostDetailsPanel({
  item,
  open,
  onOpenChange,
  onSaved,
  onRequestFullEdit,
}: Props) {
  const [workflow, setWorkflow] = React.useState<ContentWorkflowStatus>("planning")
  const [plannedLocal, setPlannedLocal] = React.useState("")
  const [pending, setPending] = React.useState<false | "save" | "sync">(false)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<ToastState>(null)

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  React.useEffect(() => {
    if (!item) return
    setWorkflow(contentItemToWorkflow(item))
    setPlannedLocal(
      formatDatetimeLocalValue(item.plannedPublishDate ?? item.scheduledAt),
    )
    setError(null)
    setToast(null)
  }, [item])

  async function saveWith(
    wf: ContentWorkflowStatus,
    planned: string,
  ) {
    if (pending || !item) return
    if (!isInstagramPersistableItem(item)) {
      setError("此為示範資料，請使用「完整編輯」查看欄位（無法寫入伺服器）。")
      return
    }
    setPending("save")
    setError(null)
    setToast(null)
    try {
      const ruleError = validateStatusAndScheduledAt(wf, planned)
      if (ruleError) {
        setError(ruleError)
        return
      }
      const iso = toPlannedPublishDateIso(planned)
      const res = await fetch("/api/content/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: wf,
          plannedPublishDate: iso,
          expectedUpdatedAt: item.updatedAt,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? "更新失敗。")
        return
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bdgoal:content-item-updated", { detail: { id: item.id } }),
        )
      }
      setPending("sync")
      try {
        await Promise.resolve(onSaved())
      } catch (syncErr) {
        const msg =
          syncErr instanceof Error
            ? syncErr.message
            : "無法同步最新資料，請稍後再試。"
        setError(msg)
        return
      }
      setToast({ message: FEEDBACK_COPY.contentUpdated })
      await new Promise((r) => setTimeout(r, 420))
      onOpenChange(false)
    } catch {
      setError("更新失敗，請稍後再試。")
    } finally {
      setPending(false)
    }
  }

  function approveDraft() {
    if (!item) return
    const next = applyStatusChangeRule("planning", plannedLocal)
    setWorkflow(next.status)
    setPlannedLocal(next.scheduledAt)
    setError(null)
    void saveWith(next.status, next.scheduledAt)
  }

  const busy = Boolean(pending)
  const primaryPendingLabel =
    pending === "sync"
      ? FEEDBACK_COPY.editSyncing
      : pending === "save"
        ? FEEDBACK_COPY.editSaving
        : false

  const display = item ? getInstagramDisplayStatus(item) : null
  const img = item ? getInstagramPrimaryImageUrl(item) : null
  const persistable = item ? isInstagramPersistableItem(item) : false

  return (
    <Sheet open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        aria-busy={busy}
      >
        {toast ? (
          <div className="px-4 pt-4">
            <DialogInlineToast type="success" message={toast.message} />
          </div>
        ) : null}
        <SheetHeader className="border-border/60 border-b px-4 pb-3">
          <SheetTitle className="pr-8 text-left leading-snug">
            {item?.title ?? "貼文詳情"}
          </SheetTitle>
          <SheetDescription className="text-left text-xs">
            {display ? (
              <span>
                狀態標籤：
                <span className="text-foreground font-medium">
                  {instagramDisplayStatusLabel[display]}
                </span>
              </span>
            ) : (
              "檢視圖片、文案與排程。"
            )}
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <div className="flex flex-1 flex-col gap-4 px-4 py-4">
            {img ? (
              <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg border border-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="size-full object-cover" />
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border/60 text-xs">
                無圖片
              </div>
            )}

            <div className="space-y-1">
              <p className="text-muted-foreground text-[11px]">Caption</p>
              <p className="text-foreground max-h-40 overflow-y-auto text-sm leading-relaxed">
                {item.caption?.trim() ? item.caption : "—"}
              </p>
            </div>

            <div className="grid gap-3 border-t border-border/60 pt-3">
              <div className="space-y-1">
                <Label htmlFor="ig-panel-status" className="text-xs">
                  工作流程狀態
                </Label>
                <select
                  id="ig-panel-status"
                  className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                  value={workflow}
                  disabled={busy}
                  onChange={(e) => {
                    const next = applyStatusChangeRule(
                      e.target.value as ContentWorkflowStatus,
                      plannedLocal,
                    )
                    setWorkflow(next.status)
                    setPlannedLocal(next.scheduledAt)
                    setError(null)
                  }}
                >
                  <option value="planning">planning（草稿／規劃）</option>
                  <option value="scheduled">scheduled（已排程）</option>
                  <option value="published">published（已發佈）</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ig-panel-planned" className="text-xs">
                  排程時間
                </Label>
                <Input
                  id="ig-panel-planned"
                  type="datetime-local"
                  value={plannedLocal}
                  disabled={busy || workflow === "published"}
                  onChange={(e) => {
                    const next = applyScheduledAtChangeRule(e.target.value, workflow)
                    setPlannedLocal(next.scheduledAt)
                    setWorkflow(next.status)
                    setError(null)
                  }}
                  className="h-9"
                />
                {workflow === "published" ? (
                  <p className="text-muted-foreground text-[11px]">
                    已發佈項目不需設定排程時間。
                  </p>
                ) : null}
              </div>
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
            </div>
          </div>
        ) : null}

        <SheetFooter className="border-border/60 gap-2 border-t">
          {item && display === "needsApproval" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={busy || !persistable}
              onClick={() => void approveDraft()}
            >
              核准（轉為草稿／規劃）
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            disabled={busy || !item}
            onClick={() => {
              if (item) {
                onOpenChange(false)
                onRequestFullEdit(item)
              }
            }}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            完整編輯
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={busy || !item || !persistable}
            onClick={() => void saveWith(workflow, plannedLocal)}
          >
            <PendingButtonLabel idle="儲存變更" pending={primaryPendingLabel} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive w-full"
            disabled
            title="刪除 API 尚未提供"
          >
            刪除（尚未開放）
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
