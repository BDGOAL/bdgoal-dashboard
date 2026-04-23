"use client"

import * as React from "react"
import { Download, Trash2, Upload } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
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
import { toPlannedPublishDateIso } from "@/components/instagram/status-schedule-rules"
import { contentItemPlannedInputValue } from "@/lib/instagram/datetime-local"
import { isInstagramPersistableItem } from "@/lib/instagram/instagram-ui-persistence"
import {
  PLANNER_UPLOAD_MAX_FILES,
  compressFilesForPlannerUpload,
  validatePlannerImageFileForQueue,
} from "@/lib/instagram/instagram-image-upload-client"
import { uploadContentItemAttachmentsSequential } from "@/lib/instagram/instagram-compose-upload"
import {
  DialogInlineToast,
  FEEDBACK_COPY,
  PendingButtonLabel,
} from "@/components/dashboard/async-feedback"
import { cn } from "@/lib/utils"

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
}

type ToastState = { message: string } | null

export function InstagramPostDetailsPanel({
  item,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [titleDraft, setTitleDraft] = React.useState("")
  const [plannedLocal, setPlannedLocal] = React.useState("")
  const [captionDraft, setCaptionDraft] = React.useState("")
  const [galleryIndex, setGalleryIndex] = React.useState(0)
  const [pending, setPending] = React.useState<
    false | "save" | "sync" | "delete" | "rmAtt" | "upload"
  >(false)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<ToastState>(null)
  const uploadInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  React.useEffect(() => {
    if (!item) return
    setTitleDraft(item.title ?? "")
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

  async function saveChanges() {
    if (pending || !item) return
    if (!isInstagramPersistableItem(item)) {
      setError("此為示範資料，無法寫入伺服器。")
      return
    }
    setPending("save")
    setError(null)
    setToast(null)
    try {
      const trimmedTitle = titleDraft.trim()
      if (!trimmedTitle) {
        setError("請填寫標題。")
        return
      }
      let plannedIso: string | null = null
      if (plannedLocal.trim() !== "") {
        plannedIso = toPlannedPublishDateIso(plannedLocal)
        if (!plannedIso) {
          setError("日期與時間格式無效，請修正或留空。")
          return
        }
      }

      const res = await fetch("/api/content/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title: trimmedTitle,
          caption: captionDraft,
          plannedPublishDate: plannedIso,
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

  async function addImages(filesLike: FileList | File[] | null) {
    if (pending || !item || !isInstagramPersistableItem(item) || readOnlyImported) return
    const files = Array.from(filesLike ?? []).filter((f) => f.type.startsWith("image/"))
    if (!files.length) {
      setError("目前僅支援圖片上傳。")
      return
    }
    const existing = (item.attachments ?? []).filter((a) => a.url?.trim()).length
    const room = Math.max(0, PLANNER_UPLOAD_MAX_FILES - existing)
    if (files.length > room) {
      setError(
        room <= 0
          ? `此貼文最多 ${PLANNER_UPLOAD_MAX_FILES} 張，請先移除部分圖片。`
          : `此貼文最多 ${PLANNER_UPLOAD_MAX_FILES} 張，尚可再加入 ${room} 張。`,
      )
      return
    }
    for (const file of files) {
      const v = validatePlannerImageFileForQueue(file)
      if (v) {
        setError(v)
        return
      }
    }
    setPending("upload")
    setError(null)
    try {
      const compressed = await compressFilesForPlannerUpload(files)
      const result = await uploadContentItemAttachmentsSequential(item.id, compressed)
      if (!result.ok) {
        if (result.kind === "network") {
          setError(
            `上傳中斷（成功 ${result.succeededCount}/${compressed.length}）：${result.error}`,
          )
        } else {
          setError(
            `部分圖片上傳失敗（成功 ${result.succeededCount}，失敗 ${result.failures.length}）。`,
          )
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bdgoal:content-item-updated", { detail: { id: item.id } }),
        )
      }
      setPending("sync")
      await Promise.resolve(onSaved())
      setToast({
        message: result.ok ? "已新增圖片" : "圖片已部分新增，請檢查結果",
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗，請稍後再試。")
    } finally {
      setPending(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ""
    }
  }

  const busy = Boolean(pending)
  const savePendingLabel =
    pending === "sync"
      ? FEEDBACK_COPY.editSyncing
      : pending === "save"
        ? FEEDBACK_COPY.editSaving
        : false

  const persistable = item ? isInstagramPersistableItem(item) : false
  const readOnlyImported = Boolean(item?.source === "asana")
  const fieldLocked = Boolean(busy || !persistable || readOnlyImported)
  const canDeleteManual = Boolean(item && persistable && item.source === "manual")
  const currentAttId = galleryItems[galleryIndex]?.attachmentId
  const downloadableAttachments = (item?.attachments ?? []).filter((a) => a.url?.trim())

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
            {item?.title ?? "貼文"}
          </SheetTitle>
          <SheetDescription className="text-left text-xs">編輯文案與行事曆日期。</SheetDescription>
        </SheetHeader>

        {item ? (
          <div className="flex flex-1 flex-col gap-4 px-4 py-4">
            {readOnlyImported ? (
              <p className="bg-muted/40 text-muted-foreground rounded-md border border-border/50 px-3 py-2 text-[11px] leading-relaxed">
                此內容僅供預覽，無法在此編輯。
              </p>
            ) : null}
            {!persistable && !readOnlyImported ? (
              <p className="bg-muted/40 text-muted-foreground rounded-md border border-border/50 px-3 py-2 text-[11px] leading-relaxed">
                示範資料無法寫入伺服器。
              </p>
            ) : null}
            <div className="space-y-1">
              <Label htmlFor="ig-panel-title" className="text-xs">
                標題
              </Label>
              <Input
                id="ig-panel-title"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                disabled={fieldLocked}
                className="h-9"
                placeholder="貼文標題"
              />
            </div>
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
                {downloadableAttachments.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {downloadableAttachments.map((attachment, idx) => (
                      <a
                        key={attachment.id ?? `${attachment.url}-${idx}`}
                        href={attachment.url!}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "w-full",
                        })}
                      >
                        <Download className="size-3.5" aria-hidden />
                        下載原圖
                      </a>
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
                    移除目前圖片
                  </Button>
                ) : null}
                <div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml"
                    multiple
                    className="sr-only"
                    disabled={fieldLocked}
                    onChange={(e) => void addImages(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full gap-1"
                    disabled={fieldLocked}
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <Upload className="size-3.5" aria-hidden />
                    新增圖片
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-muted text-muted-foreground flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border/60 text-xs">
                  無圖片
                </div>
                <div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml"
                    multiple
                    className="sr-only"
                    disabled={fieldLocked}
                    onChange={(e) => void addImages(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-1"
                    disabled={fieldLocked}
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <Upload className="size-3.5" aria-hidden />
                    新增圖片
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="ig-panel-caption" className="text-xs">
                文案
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

            <div className="space-y-1 border-t border-border/60 pt-3">
              <Label htmlFor="ig-panel-planned" className="text-xs">
                行事曆日期（選填）
              </Label>
              <Input
                id="ig-panel-planned"
                type="datetime-local"
                value={plannedLocal}
                disabled={fieldLocked}
                onChange={(e) => {
                  setPlannedLocal(e.target.value)
                  setError(null)
                }}
                className="h-9"
              />
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                留空則不顯示在月曆格線日期上（仍可能出現在未設定日期區）。
              </p>
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
            </div>
          </div>
        ) : null}

        <SheetFooter className="border-border/60 flex-col gap-2 border-t">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={busy || !item || !persistable || readOnlyImported}
            onClick={() => void saveChanges()}
          >
            <PendingButtonLabel idle="儲存" pending={savePendingLabel} />
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
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
