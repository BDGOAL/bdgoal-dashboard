"use client"

import * as React from "react"
import { ExternalLink, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { contentItemPlannedInputValue } from "@/lib/instagram/datetime-local"
import { isInstagramPersistableItem } from "@/lib/instagram/instagram-ui-persistence"
import {
  DialogInlineToast,
  FEEDBACK_COPY,
  PendingButtonLabel,
} from "@/components/dashboard/async-feedback"
import { cn } from "@/lib/utils"

function contentItemToWorkflow(item: ContentItem): ContentWorkflowStatus {
  if (item.status === "published") return "published"
  if (item.status === "scheduled") return "scheduled"
  return "planning"
}

/** 圖庫順序與 `content_attachments.sort_order` 一致；無附件列時僅顯示 thumbnail（不可單張刪除）。 */
function galleryItemsForItem(item: ContentItem): Array<{ url: string; attachmentId?: string }> {
  const atts = item.attachments ?? []
  const withUrl = atts.filter((a) => a.url?.trim())
  if (withUrl.length) {
    return withUrl.map((a) => ({ url: a.url!.trim(), attachmentId: a.id }))
  }
  const thumb = item.thumbnail?.trim()
  if (thumb) return [{ url: thumb }]
  return []
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
  const [captionDraft, setCaptionDraft] = React.useState("")
  const [galleryIndex, setGalleryIndex] = React.useState(0)
  const [pending, setPending] = React.useState<false | "save" | "sync" | "delete" | "rmAtt">(false)
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
    setPlannedLocal(contentItemPlannedInputValue(item))
    setCaptionDraft(item.caption ?? "")
    setGalleryIndex(0)
    setError(null)
    setToast(null)
  }, [item])

  const galleryItems = item ? galleryItemsForItem(item) : []
  React.useEffect(() => {
    setGalleryIndex((i) => Math.min(i, Math.max(0, galleryItems.length - 1)))
  }, [galleryItems.length, item?.id])

  async function saveWith(wf: ContentWorkflowStatus, planned: string) {
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
      const iso =
        wf === "published"
          ? null
          : planned.trim() === ""
            ? null
            : toPlannedPublishDateIso(planned)
      if (wf !== "published" && planned.trim() !== "" && iso === null) {
        setError("日期與時間格式無效，請修正或留空。")
        return
      }
      const res = await fetch("/api/content/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: wf,
          plannedPublishDate: iso,
          caption: captionDraft,
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

  async function deletePost() {
    if (pending || !item || !isInstagramPersistableItem(item)) return
    if (item.source !== "manual") return
    if (!window.confirm("確定刪除此貼文？此動作無法復原。")) return
    setPending("delete")
    setError(null)
    try {
      const res = await fetch(`/api/content/items/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      })
      const raw = await res.text()
      let json = {} as { error?: string }
      if (raw) {
        try {
          json = JSON.parse(raw) as { error?: string }
        } catch {
          setError(`刪除失敗（${res.status}）：${raw.slice(0, 160)}`)
          return
        }
      }
      if (!res.ok) {
        setError(json.error ?? "刪除失敗。")
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
      onOpenChange(false)
    } catch {
      setError("刪除失敗，請稍後再試。")
    } finally {
      setPending(false)
    }
  }

  async function removeAttachment(attachmentId: string) {
    if (pending || !item || !isInstagramPersistableItem(item)) return
    if (!window.confirm("從此貼文移除這張圖片？（Storage 檔案仍可能保留）")) return
    setPending("rmAtt")
    setError(null)
    try {
      const res = await fetch(
        `/api/content/items/${encodeURIComponent(item.id)}/attachments/${encodeURIComponent(attachmentId)}`,
        { method: "DELETE" },
      )
      const raw = await res.text()
      let json = {} as { error?: string }
      if (raw) {
        try {
          json = JSON.parse(raw) as { error?: string }
        } catch {
          setError(`移除附件失敗（${res.status}）：${raw.slice(0, 160)}`)
          return
        }
      }
      if (!res.ok) {
        setError(json.error ?? "移除附件失敗。")
        return
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bdgoal:content-item-updated", { detail: { id: item.id } }),
        )
      }
      await Promise.resolve(onSaved())
      setGalleryIndex(0)
    } catch {
      setError("移除附件失敗，請稍後再試。")
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
  const savePendingLabel =
    pending === "sync"
      ? FEEDBACK_COPY.editSyncing
      : pending === "save"
        ? FEEDBACK_COPY.editSaving
        : false

  const display = item ? getInstagramDisplayStatus(item) : null
  const persistable = item ? isInstagramPersistableItem(item) : false
  /** Asana 匯入：可開啟詳情預覽，欄位唯讀（與 Calendar 一致由同一 Sheet 呈現） */
  const readOnlyImported = Boolean(item?.source === "asana")
  const fieldLocked = Boolean(busy || !persistable || readOnlyImported)
  const canDeleteManual = Boolean(item && persistable && item.source === "manual")
  const currentAttId = galleryItems[galleryIndex]?.attachmentId

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
            {readOnlyImported ? (
              <p className="bg-muted/50 text-muted-foreground rounded-md border border-border/50 px-3 py-2 text-[11px] leading-relaxed">
                此貼文來自 <span className="text-foreground font-medium">Asana</span>{" "}
                匯入，僅供在此檢視與對齊牆面／月曆；編輯內容請回到 Asana 來源任務。
              </p>
            ) : null}
            {!persistable && !readOnlyImported ? (
              <p className="bg-muted/50 text-muted-foreground rounded-md border border-border/50 px-3 py-2 text-[11px] leading-relaxed">
                示範資料無法寫入伺服器；請使用「完整編輯」僅檢視欄位說明。
              </p>
            ) : null}
            {galleryItems.length > 0 ? (
              <div className="space-y-2">
                <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg border border-border/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={galleryItems[galleryIndex]?.url ?? galleryItems[0]?.url}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                {galleryItems.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {galleryItems.map((g, idx) => (
                      <button
                        key={`${g.url}-${idx}`}
                        type="button"
                        disabled={busy}
                        onClick={() => setGalleryIndex(idx)}
                        className={cn(
                          "ring-offset-background size-12 overflow-hidden rounded-md border-2",
                          galleryIndex === idx ? "border-primary" : "border-transparent",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt="" className="size-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
                {currentAttId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/40 w-full gap-1"
                    disabled={fieldLocked}
                    onClick={() => void removeAttachment(currentAttId)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    移除目前附件
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="bg-muted text-muted-foreground flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border/60 text-xs">
                無圖片
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="ig-panel-caption" className="text-xs">
                Caption
              </Label>
              <Textarea
                id="ig-panel-caption"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                disabled={fieldLocked}
                rows={5}
                className="min-h-[100px] resize-y text-sm"
                placeholder="編輯文案…"
              />
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
                  disabled={fieldLocked}
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
                  排程時間（選填；scheduled 時必填）
                </Label>
                <Input
                  id="ig-panel-planned"
                  type="datetime-local"
                  value={plannedLocal}
                  disabled={fieldLocked || workflow === "published"}
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
              disabled={fieldLocked}
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
            disabled={busy || !item || readOnlyImported}
            title={
              readOnlyImported ? "Asana 項目請於來源編輯" : undefined
            }
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
            disabled={busy || !item || !persistable || readOnlyImported}
            onClick={() => void saveWith(workflow, plannedLocal)}
          >
            <PendingButtonLabel idle="儲存變更" pending={savePendingLabel} />
          </Button>
          {canDeleteManual ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive w-full"
              disabled={busy}
              onClick={() => void deletePost()}
            >
              {pending === "delete" ? "刪除中…" : "刪除貼文"}
            </Button>
          ) : (
            <span
              className="inline-block w-full"
              title="Asana 或示範資料無法由此刪除；僅手動建立的貼文可刪。"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground w-full"
                disabled
              >
                刪除貼文（僅手動建立）
              </Button>
            </span>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
