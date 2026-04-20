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
import { uploadInstagramComposeMedia } from "@/lib/instagram/instagram-compose-upload"

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
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<ToastState>(null)
  const [mediaFile, setMediaFile] = React.useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = React.useState<string | null>(null)
  const [dragActive, setDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(timer)
  }, [toast])

  React.useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    }
  }, [mediaPreviewUrl])

  const reset = React.useCallback(() => {
    setSurfaceTab("post")
    setLocalTitle("")
    setLocalCaption("")
    setDisplayStatus("draft")
    setScheduledLocal("")
    setError(null)
    setRetryItemId(null)
    setMediaFile(null)
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setMediaPreviewUrl(null)
  }, [mediaPreviewUrl])

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

  function applyImageFile(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      setError("請拖放或選擇一張圖片檔（例如 PNG、JPEG）。")
      return
    }
    setError(null)
    setMediaFile(file)
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
    setMediaPreviewUrl(URL.createObjectURL(file))
  }

  function onDropMedia(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    applyImageFile(f ?? null)
  }

  function insertCaptionSnippet(snippet: string) {
    setLocalCaption((c) => (c ? `${c}${snippet}` : snippet))
  }

  async function submit(mode: SubmitMode) {
    if (busy || !canCompose || !clientLabelForApi) return

    if (retryItemId) {
      if (!mediaFile) {
        setError("請選擇要上傳的圖片後再試，或關閉視窗於列表中稍後補圖。")
        return
      }
      setPending("upload")
      setError(null)
      setToast(null)
      try {
        const up = await uploadInstagramComposeMedia(retryItemId, mediaFile, {
          typeLabel: mediaFile.name,
        })
        if (!up.ok) {
          setError(`圖片上傳失敗：${up.error}`)
          return
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

      if (mediaFile) {
        setPending("upload")
        const up = await uploadInstagramComposeMedia(newId, mediaFile, {
          typeLabel: mediaFile.name,
        })
        if (!up.ok) {
          setRetryItemId(newId)
          setError(
            `貼文已建立，但圖片上傳失敗：${up.error}。請保留圖片後再按「儲存草稿」僅重試上傳，或關閉視窗稍後補圖。`,
          )
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
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => applyImageFile(e.target.files?.[0] ?? null)}
                />
                {mediaPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaPreviewUrl}
                    alt=""
                    className="max-h-[min(50vh,360px)] w-full rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <Upload className="text-muted-foreground size-10" aria-hidden />
                    <p className="text-muted-foreground text-center text-sm">
                      拖放圖片至此，或點擊上傳
                    </p>
                    <p className="text-muted-foreground text-center text-[11px]">
                      儲存後會上傳至 Supabase Storage 並建立附件紀錄。
                    </p>
                  </>
                )}
              </div>
              {mediaPreviewUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    setMediaFile(null)
                    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl)
                    setMediaPreviewUrl(null)
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  移除圖片
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
                流程：先建立內容項目，再上傳圖片。若上傳失敗，貼文仍會保留，可再按「儲存草稿」僅重試上傳。
                「儲存草稿」／待審核可不填日期；有填則一併儲存為預計時間。「排程」按鈕須有時間；「發佈」為 published。
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
