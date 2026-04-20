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
import { FEEDBACK_COPY, PendingButtonLabel } from "@/components/dashboard/async-feedback"
import { isInstagramClientScope } from "@/lib/instagram/instagram-scope"
import {
  PLANNER_UPLOAD_MAX_EDGE,
  PLANNER_UPLOAD_MAX_FILES,
  validatePlannerImageFileForQueue,
} from "@/lib/instagram/instagram-image-upload-client"

type SurfaceTab = "post" | "story" | "reels"

function surfaceTabToContentType(tab: SurfaceTab): ContentPostType {
  if (tab === "story") return "story"
  if (tab === "reels") return "reels"
  return "feed"
}

type InstagramAddPostDialogProps = {
  /** 可選：額外同步（例如 refetch）；若已在 onPostCreated 內處理可省略。 */
  onAdded?: () => void | Promise<void>
  /** POST 成功後（關閉視窗後）交給父層背景上傳圖片 */
  onPostCreated?: (payload: {
    id: string
    title: string
    caption: string
    files: File[]
  }) => void
  workspaceContentItems: ContentItem[]
  apiClientName: string | null
}

type MediaSlot = { file: File; previewUrl: string }

export function InstagramAddPostDialog({
  onAdded: onAddedProp,
  onPostCreated,
  workspaceContentItems,
  apiClientName,
}: InstagramAddPostDialogProps) {
  const { scope } = useWorkspaceScope()
  const clientScope = isInstagramClientScope(scope)

  const [open, setOpen] = React.useState(false)
  const [surfaceTab, setSurfaceTab] = React.useState<SurfaceTab>("post")
  const [localTitle, setLocalTitle] = React.useState("")
  const [localCaption, setLocalCaption] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mediaSlots, setMediaSlots] = React.useState<MediaSlot[]>([])
  const [selectedMediaIndex, setSelectedMediaIndex] = React.useState(0)
  const [dragActive, setDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
    setError(null)
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

  const busy = pending
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
    setMediaSlots((prev) => {
      const next = [...prev]
      for (const file of files) {
        next.push({ file, previewUrl: URL.createObjectURL(file) })
      }
      return next
    })
  }

  function removeMediaAt(index: number) {
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

  async function submit() {
    if (busy || !canCompose || !clientLabelForApi) return

    const trimmedTitle = localTitle.trim()
    if (!trimmedTitle) {
      setError("請填寫標題。")
      return
    }
    if (surfaceTab !== "post") {
      setError("目前僅開放「貼文」格式，Story／Reels 即將推出。")
      return
    }

    const filesSnapshot = mediaSlots.map((s) => s.file)

    const createPayload = {
      title: trimmedTitle,
      caption: localCaption.trim(),
      plannedPublishDate: null as string | null,
      platform: "instagram" as const,
      contentType: surfaceTabToContentType(surfaceTab),
      status: "published" as const,
      client: clientLabelForApi,
      localNotes: null as string | null,
    }

    setPending(true)
    setError(null)
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

      onPostCreated?.({
        id: newId,
        title: trimmedTitle,
        caption: localCaption.trim(),
        files: filesSnapshot,
      })

      reset()
      setOpen(false)
      void Promise.resolve(onAddedProp?.())
    } catch {
      setError("新增失敗，請稍後再試。")
    } finally {
      setPending(false)
    }
  }

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
          <DialogHeader className="border-border/50 space-y-1 border-b px-4 py-3 text-left">
            <DialogTitle className="text-base">撰寫貼文</DialogTitle>
            <DialogDescription className="text-xs">
              由此建立的項目預設為已發佈（published），不強制排程日期；圖片可於送出後在背景上傳。
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-2">
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
                      送出後會在背景依序上傳至 Storage（無須等待此視窗）。
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="text-muted-foreground size-10" aria-hidden />
                    <p className="text-muted-foreground text-center text-sm">
                      拖放一張或多張圖片，或點擊上傳
                    </p>
                    <p className="text-muted-foreground text-center text-[11px]">
                      送出後圖片於背景上傳；長邊約 {PLANNER_UPLOAD_MAX_EDGE}px 壓縮，最多{" "}
                      {PLANNER_UPLOAD_MAX_FILES} 張。
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

              {error ? <p className="text-destructive text-xs">{error}</p> : null}
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
            <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>
              {busy ? (
                <PendingButtonLabel idle="新增貼文" pending={FEEDBACK_COPY.addSubmitting} />
              ) : (
                "新增貼文"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
