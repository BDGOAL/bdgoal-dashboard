"use client"

import * as React from "react"
import { PlusIcon, Sparkles, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ContentPostType } from "@/lib/types/dashboard"
import type { ContentItem } from "@/lib/types/dashboard"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"
import { toPlannedPublishDateIso, validateStatusAndScheduledAt } from "@/components/instagram/status-schedule-rules"
import {
  DialogInlineToast,
  FEEDBACK_COPY,
  PendingButtonLabel,
} from "@/components/dashboard/async-feedback"
import {
  INSTAGRAM_NEEDS_APPROVAL_LOCAL_MARKER,
  instagramDisplayStatusLabel,
  type InstagramDisplayStatus,
} from "@/lib/instagram/instagram-display-status"
import { isInstagramClientScope } from "@/lib/instagram/instagram-scope"
import { uploadContentItemAttachmentsSequential } from "@/lib/instagram/instagram-compose-upload"
import {
  compressImageForPlannerUpload,
  PLANNER_UPLOAD_MAX_EDGE,
  PLANNER_UPLOAD_MAX_FILES,
  PLANNER_UPLOAD_MAX_OUTPUT_BYTES,
  validatePlannerImageFileForQueue,
} from "@/lib/instagram/instagram-image-upload-client"

const selectClass = cn(
  "border-input bg-background dark:bg-input/30 h-9 w-full rounded-md border px-2 text-sm shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

type SurfaceTab = "post" | "story" | "reels"

function surfaceTabToContentType(tab: SurfaceTab): ContentPostType {
  if (tab === "story") return "story"
  if (tab === "reels") return "reels"
  return "feed"
}

type SubmitMode = "draft" | "schedule" | "publish"

type InstagramAddPostDialogProps = {
  onAdded: () => void | Promise<void>
  workspaceContentItems: ContentItem[]
  /** 來自 /api/clients 的顯示名，與頂端選定客戶對齊 */
  apiClientName: string | null
}

type ToastState = { message: string } | null

type MediaSlot = { file: File; previewUrl: string }

async function buildCompressedFilesForSlots(slots: MediaSlot[]): Promise<File[]> {
  return Promise.all(
    slots.map(async (slot) => {
      const f = await compressImageForPlannerUpload(slot.file)
      if (f.size > PLANNER_UPLOAD_MAX_OUTPUT_BYTES) {
        throw new Error(
          `「${slot.file.name}」壓縮後仍約 ${(f.size / (1024 * 1024)).toFixed(1)}MB，請改用小圖或降低解析度。`,
        )
      }
      return f
    }),
  )
}

function displayStatusToSubmit(
  display: InstagramDisplayStatus,
  mode: SubmitMode,
  scheduledLocal: string,
):
  | {
      status: "planning" | "scheduled" | "published"
      plannedPublishDate: string | null
      localNotes: string | null
    }
  | { error: string } {
  if (mode === "publish") {
    return {
      status: "published",
      plannedPublishDate: null,
      localNotes: null,
    }
  }

  if (mode === "schedule") {
    const err = validateStatusAndScheduledAt("scheduled", scheduledLocal)
    if (err) return { error: err }
    return {
      status: "scheduled",
      plannedPublishDate: toPlannedPublishDateIso(scheduledLocal),
      localNotes: null,
    }
  }

  /* 儲存草稿：草稿／待審核／已排程（僅 UI）皆可不填日期；選填日期則以 planning + planned_publish_date 保存 */
  if (display === "published") {
    return { error: "若要標示為已發佈，請按「發佈」。" }
  }

  const notes =
    display === "needsApproval" ? INSTAGRAM_NEEDS_APPROVAL_LOCAL_MARKER : null

  if (scheduledLocal.trim() !== "") {
    const iso = toPlannedPublishDateIso(scheduledLocal)
    if (!iso) {
      return { error: "日期與時間格式無效，請修正或留空。" }
    }
    return {
      status: "planning",
      plannedPublishDate: iso,
      localNotes: notes,
    }
  }

  return {
    status: "planning",
    plannedPublishDate: null,
    localNotes: notes,
  }
}

export function InstagramAddPostDialog({
  onAdded,
  workspaceContentItems,
  apiClientName,
}: InstagramAddPostDialogProps) {
  const { scope } = useWorkspaceScope()
  const clientScope = isInstagramClientScope(scope)

  const [open, setOpen] = React.useState(false)
  const [surfaceTab, setSurfaceTab] = React.useState<SurfaceTab>("post")
  const [localTitle, setLocalTitle] = React.useState("")
  const [localCaption, setLocalCaption] = React.useState("")
  const [displayStatus, setDisplayStatus] =
    React.useState<InstagramDisplayStatus>("draft")
  const [scheduledLocal, setScheduledLocal] = React.useState("")
  const [pending, setPending] = React.useState<false | "post" | "upload" | "sync">(false)
  /** 建立成功但上傳失敗時，僅重試上傳用 */
  const [retryItemId, setRetryItemId] = React.useState<string | null>(null)
  /** 僅重試：對應 `mediaSlots` 的索引（API 失敗時寫入；變更媒體清單時清除） */
  const [uploadFailedIndices, setUploadFailedIndices] = React.useState<number[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<ToastState>(null)
  const [mediaSlots, setMediaSlots] = React.useState<MediaSlot[]>([])
  const [selectedMediaIndex, setSelectedMediaIndex] = React.useState(0)
  const [dragActive, setDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(timer)
  }, [toast])

  React.useEffect(() => {
    return () => {
      for (const s of mediaSlots) URL.revokeObjectURL(s.previewUrl)
    }
  }, [mediaSlots])

  React.useEffect(() => {
    setSelectedMediaIndex((i) => {
      if (mediaSlots.length === 0) return 0
      return Math.min(i, mediaSlots.length - 1)
    })
  }, [mediaSlots.length])

  const reset = React.useCallback(() => {
    setSurfaceTab("post")
    setLocalTitle("")
    setLocalCaption("")
    setDisplayStatus("draft")
    setScheduledLocal("")
    setError(null)
    setRetryItemId(null)
    setUploadFailedIndices(null)
    setMediaSlots((prev) => {
      for (const s of prev) URL.revokeObjectURL(s.previewUrl)
      return []
    })
    setSelectedMediaIndex(0)
  }, [])

  const requestClose = React.useCallback(
    (next: boolean) => {
      if (!next && pending) return
      if (!next) reset()
      setOpen(next)
    },
    [pending, reset],
  )

  const clientLabelForApi = React.useMemo(() => {
    if (!clientScope) return null
    const fromApi = apiClientName?.trim()
    if (fromApi) return fromApi
    const hit = workspaceContentItems.find((i) => i.clientId === scope.clientId)
    return hit?.clientName?.trim() ?? null
  }, [apiClientName, clientScope, scope, workspaceContentItems])

  const busy = Boolean(pending)
  const canCompose = clientScope && Boolean(clientLabelForApi)

  function appendImageFiles(source: FileList | File[] | null) {
    if (!source || source.length === 0) return
    const files = Array.from(source).filter((f) => f.type.startsWith("image/"))
    if (!files.length) {
      setError("請拖放或選擇圖片檔（image/*）。")
      return
    }
    const room = PLANNER_UPLOAD_MAX_FILES - mediaSlots.length
    if (files.length > room) {
      setError(
        room <= 0
          ? `最多 ${PLANNER_UPLOAD_MAX_FILES} 張圖，請先移除部分圖片。`
          : `最多 ${PLANNER_UPLOAD_MAX_FILES} 張，尚可再加入 ${room} 張。`,
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
    setError(null)
    setUploadFailedIndices(null)
    setMediaSlots((prev) => {
      const next = [...prev]
      for (const file of files) {
        next.push({ file, previewUrl: URL.createObjectURL(file) })
      }
      return next
    })
  }

  function removeMediaAt(index: number) {
    setUploadFailedIndices(null)
    setMediaSlots((prev) => {
      if (index < 0 || index >= prev.length) return prev
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return copy
    })
  }

  function onDropMedia(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    appendImageFiles(e.dataTransfer.files)
  }

  function insertCaptionSnippet(snippet: string) {
    setLocalCaption((c) => (c ? `${c}${snippet}` : snippet))
  }

  async function submit(mode: SubmitMode) {
    if (busy || !canCompose || !clientLabelForApi) return

    if (retryItemId) {
      if (!mediaSlots.length) {
        setError("請選擇要上傳的圖片後再試，或關閉視窗於列表中稍後補圖。")
        return
      }
      setPending("upload")
      setError(null)
      setToast(null)
      try {
        let files: File[]
        try {
          files = await buildCompressedFilesForSlots(mediaSlots)
        } catch (prepErr) {
          const msg =
            prepErr instanceof Error ? prepErr.message : "圖片處理失敗，請稍後再試。"
          setError(msg)
          return
        }
        const indices =
          uploadFailedIndices?.length && uploadFailedIndices.length < files.length
            ? uploadFailedIndices
            : files.map((_, i) => i)
        const batch = await uploadContentItemAttachmentsSequential(retryItemId, files, {
          indices,
        })
        if (!batch.ok) {
          if (batch.kind === "network") {
            setUploadFailedIndices(batch.retryIndices)
            setError(
              `上傳中斷（${batch.succeededCount}/${indices.length} 已完成）：${batch.error}`,
            )
            return
          }
          setRetryItemId(retryItemId)
          setUploadFailedIndices(batch.failures.map((f) => f.index))
          const failLines = batch.failures
            .slice(0, 4)
            .map((f) => `「${f.fileName}」：${f.error}`)
            .join(" ")
          const more =
            batch.failures.length > 4 ? ` 等共 ${batch.failures.length} 個檔案。` : ""
          setError(
            `部分圖片未上傳（成功 ${batch.succeededCount}，失敗 ${batch.failures.length}）：${failLines}${more}`,
          )
          if (batch.succeededCount > 0) {
            try {
              await Promise.resolve(onAdded())
            } catch {
              /* sync 錯誤以下方錯誤為主 */
            }
          }
          return
        }
        setUploadFailedIndices(null)
        setPending("sync")
        try {
          await Promise.resolve(onAdded())
        } catch (syncErr) {
          const msg =
            syncErr instanceof Error
              ? syncErr.message
              : "無法同步最新資料，請稍後再試。"
          setError(msg)
          return
        }
        setToast({ message: FEEDBACK_COPY.postAdded })
        await new Promise((resolve) => setTimeout(resolve, 420))
        reset()
        setOpen(false)
      } catch {
        setError("上傳失敗，請稍後再試。")
      } finally {
        setPending(false)
      }
      return
    }

    const trimmedTitle = localTitle.trim()
    if (!trimmedTitle) {
      setError("請填寫標題。")
      return
    }
    if (surfaceTab !== "post") {
      setError("目前僅開放「貼文」格式，Story／Reels 即將推出。")
      return
    }

    const mapped = displayStatusToSubmit(displayStatus, mode, scheduledLocal)
    if ("error" in mapped) {
      setError(mapped.error)
      return
    }

    const createPayload = {
      title: trimmedTitle,
      caption: localCaption.trim(),
      plannedPublishDate: mapped.plannedPublishDate,
      platform: "instagram" as const,
      contentType: surfaceTabToContentType(surfaceTab),
      status: mapped.status,
      client: clientLabelForApi,
      localNotes: mapped.localNotes,
    }

    setPending("post")
    setError(null)
    setToast(null)
    try {
      const res = await fetch("/api/content/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayload),
      })
      const json = (await res.json()) as {
        error?: string
        item?: { id: string }
      }
      if (!res.ok) {
        setError(json.error ?? "新增失敗。")
        return
      }
      const newId = json.item?.id?.trim()
      if (!newId) {
        setError("建立成功但回應缺少項目 id。")
        return
      }

      if (mediaSlots.length > 0) {
        setPending("upload")
        let files: File[]
        try {
          files = await buildCompressedFilesForSlots(mediaSlots)
        } catch (prepErr) {
          const msg =
            prepErr instanceof Error ? prepErr.message : "圖片處理失敗，請稍後再試。"
          setError(msg)
          setRetryItemId(newId)
          setPending("sync")
          try {
            await Promise.resolve(onAdded())
          } catch {
            /* ignore */
          }
          return
        }
        const batch = await uploadContentItemAttachmentsSequential(newId, files)
        if (!batch.ok) {
          setRetryItemId(newId)
          if (batch.kind === "network") {
            setUploadFailedIndices(batch.retryIndices)
            setError(
              `貼文已建立，但上傳中斷（${batch.succeededCount}/${files.length} 已完成）：${batch.error}。請再按「儲存草稿」僅重試未完成檔案。`,
            )
          } else {
            setUploadFailedIndices(batch.failures.map((f) => f.index))
            const failLines = batch.failures
              .slice(0, 3)
              .map((f) => `「${f.fileName}」：${f.error}`)
              .join(" ")
            const more =
              batch.failures.length > 3 ? ` 等共 ${batch.failures.length} 個檔案。` : ""
            setError(
              `貼文已建立；圖片部分失敗（成功 ${batch.succeededCount}，失敗 ${batch.failures.length}）：${failLines}${more} 可保留圖片後再按「儲存草稿」重試失敗項目。`,
            )
          }
          setPending("sync")
          try {
            await Promise.resolve(onAdded())
          } catch (syncErr) {
            const msg =
              syncErr instanceof Error
                ? syncErr.message
                : "無法同步最新資料，請稍後再試。"
            setError(msg)
          }
          return
        }
        setUploadFailedIndices(null)
      }

      setPending("sync")
      try {
        await Promise.resolve(onAdded())
      } catch (syncErr) {
        const msg =
          syncErr instanceof Error
            ? syncErr.message
            : "無法同步最新資料，請稍後再試。"
        setError(msg)
        return
      }
      setToast({ message: FEEDBACK_COPY.postAdded })
      await new Promise((resolve) => setTimeout(resolve, 520))
      reset()
      setOpen(false)
    } catch {
      setError("新增失敗，請稍後再試。")
    } finally {
      setPending(false)
    }
  }

  const primaryPendingLabel =
    pending === "sync"
      ? FEEDBACK_COPY.addSyncing
      : pending === "upload"
        ? FEEDBACK_COPY.addUploadingMedia
        : pending === "post"
          ? FEEDBACK_COPY.addSubmitting
          : false

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1"
        disabled={!canCompose}
        title={
          !clientScope
            ? "請先在「範圍」選擇單一客戶"
            : !clientLabelForApi
              ? "無法解析客戶名稱，請稍後再試"
              : undefined
        }
        onClick={() => {
          if (!canCompose) return
          setOpen(true)
        }}
      >
        <PlusIcon className="size-3.5" aria-hidden />
        新增貼文
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && pending) return
          requestClose(v)
        }}
      >
        <DialogContent
          className={cn(
            "flex max-h-[min(92vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl",
          )}
          showCloseButton={!pending}
          aria-busy={busy}
        >
          {toast ? (
            <div className="px-4 pt-4">
              <DialogInlineToast type="success" message={toast.message} />
            </div>
          ) : null}
          <DialogHeader className="border-border/50 space-y-1 border-b px-4 py-3 text-left">
            <DialogTitle className="text-base">撰寫貼文</DialogTitle>
            <DialogDescription className="text-xs">
              建立 Instagram 內容並寫入 BDGoal 內容庫；排程後會同步顯示於 Grid 與 Calendar。
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-2">
            {/* 左：媒體 */}
            <div className="border-border/50 flex flex-col gap-2 border-b p-4 md:border-b-0 md:border-r">
              <Label className="text-muted-foreground text-xs">媒體</Label>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDrop={onDropMedia}
                className={cn(
                  "bg-muted/30 relative flex min-h-[200px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors outline-none",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border/70 hover:border-border",
                  "focus-visible:ring-ring focus-visible:ring-2",
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    appendImageFiles(e.target.files)
                    e.target.value = ""
                  }}
                />
                {mediaSlots.length > 0 ? (
                  <div className="flex w-full flex-col gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaSlots[selectedMediaIndex]?.previewUrl ?? ""}
                      alt=""
                      className="max-h-[min(50vh,360px)] w-full rounded-lg object-contain"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {mediaSlots.map((slot, idx) => (
                        <div key={`${slot.previewUrl}-${idx}`} className="relative">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMediaIndex(idx)
                            }}
                            className={cn(
                              "ring-offset-background size-14 overflow-hidden rounded-md border-2 bg-black/20",
                              selectedMediaIndex === idx
                                ? "border-primary"
                                : "border-transparent",
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={slot.previewUrl}
                              alt=""
                              className="size-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMediaAt(idx)
                            }}
                            className="bg-background/90 text-destructive absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border text-[10px] shadow"
                            aria-label="移除此圖"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-center text-[11px]">
                      可繼續點擊或拖放加入更多圖片（依序上傳）。
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="text-muted-foreground size-10" aria-hidden />
                    <p className="text-muted-foreground text-center text-sm">
                      拖放一張或多張圖片，或點擊上傳
                    </p>
                    <p className="text-muted-foreground text-center text-[11px]">
                      儲存後會依序上傳至 Supabase Storage 並建立附件紀錄。
                    </p>
                  </>
                )}
              </div>
              {mediaSlots.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadFailedIndices(null)
                    setMediaSlots((prev) => {
                      for (const s of prev) URL.revokeObjectURL(s.previewUrl)
                      return []
                    })
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  移除全部圖片
                </Button>
              ) : null}
            </div>

            {/* 右：內容 */}
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
              <div
                role="tablist"
                aria-label="貼文格式"
                className="bg-muted/40 inline-flex rounded-full border border-border/60 p-0.5"
              >
                {(
                  [
                    { id: "post" as const, label: "貼文 Post", disabled: false },
                    { id: "story" as const, label: "限動 Story", disabled: true },
                    { id: "reels" as const, label: "Reels", disabled: true },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={surfaceTab === t.id}
                    disabled={busy || t.disabled}
                    onClick={() => setSurfaceTab(t.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      surfaceTab === t.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                      t.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <Label htmlFor="ig-compose-title" className="text-xs">
                  標題
                </Label>
                <Input
                  id="ig-compose-title"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  placeholder="內部標題（必填）"
                  disabled={busy}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="ig-compose-caption" className="text-xs">
                    文案
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 gap-1 px-2 text-[11px]"
                      disabled={busy}
                      onClick={() => insertCaptionSnippet(" #")}
                    >
                      <Sparkles className="size-3" aria-hidden />
                      # 標籤
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground h-7 px-2 text-[11px]"
                      disabled={busy}
                      onClick={() => insertCaptionSnippet("\n\n")}
                    >
                      段落
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="ig-compose-caption"
                  value={localCaption}
                  onChange={(e) => setLocalCaption(e.target.value)}
                  placeholder="寫點什麼…"
                  disabled={busy}
                  rows={6}
                  className="min-h-[140px] resize-y text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="ig-compose-status" className="text-xs">
                    狀態
                  </Label>
                  <select
                    id="ig-compose-status"
                    className={selectClass}
                    value={displayStatus}
                    disabled={busy}
                    onChange={(e) =>
                      setDisplayStatus(e.target.value as InstagramDisplayStatus)
                    }
                  >
                    {(Object.keys(instagramDisplayStatusLabel) as InstagramDisplayStatus[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {instagramDisplayStatusLabel[k]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ig-compose-when" className="text-xs">
                    日期與時間（選填；按「排程」時必填）
                  </Label>
                  <Input
                    id="ig-compose-when"
                    type="datetime-local"
                    value={scheduledLocal}
                    disabled={busy || displayStatus === "published"}
                    onChange={(e) => setScheduledLocal(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {error ? <p className="text-destructive text-xs">{error}</p> : null}
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                圖片僅供編排預覽；上傳前會在瀏覽器內縮放（長邊約 {PLANNER_UPLOAD_MAX_EDGE}px）並轉成
                JPEG 壓縮，最多 {PLANNER_UPLOAD_MAX_FILES} 張，以符合主機單次請求上限、避免 413。流程：先建立內容項目，再依序上傳；失敗可再按「儲存草稿」重試。
                「儲存草稿」／待審核可不填日期；「排程」須有時間；「發佈」為 published。
              </p>
            </div>
          </div>

          <DialogFooter className="border-border/50 bg-muted/15 gap-2 border-t px-4 py-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => requestClose(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void submit("draft")}
            >
              {busy ? (
                <PendingButtonLabel idle="儲存草稿" pending={primaryPendingLabel} />
              ) : (
                "儲存草稿"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void submit("schedule")}
            >
              排程
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void submit("publish")}>
              發佈
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
