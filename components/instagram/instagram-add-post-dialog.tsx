"use client"

import * as React from "react"
import { PlusIcon, Trash2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ContentItem } from "@/lib/types/dashboard"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"
import { FEEDBACK_COPY, PendingButtonLabel } from "@/components/dashboard/async-feedback"
import { isInstagramClientScope } from "@/lib/instagram/instagram-scope"
import {
  PLANNER_UPLOAD_MAX_EDGE,
  PLANNER_UPLOAD_MAX_FILES,
  PLANNER_UPLOAD_MAX_ORIGINAL_BYTES,
  PLANNER_UPLOAD_MAX_OUTPUT_BYTES,
  validatePlannerImageFileForQueue,
} from "@/lib/instagram/instagram-image-upload-client"

const MAX_ORIGINAL_MB = Math.round(PLANNER_UPLOAD_MAX_ORIGINAL_BYTES / 1024 / 1024)
const MAX_OUTPUT_MB = (PLANNER_UPLOAD_MAX_OUTPUT_BYTES / 1024 / 1024).toFixed(0)

type InstagramAddPostDialogProps = {
  onAdded?: () => void | Promise<void>
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
      setError("目前僅支援圖片，請選擇 JPEG／PNG／WebP 等圖檔。")
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

  async function submit() {
    if (busy || !canCompose || !clientLabelForApi) return

    const trimmedTitle = localTitle.trim()
    if (!trimmedTitle) {
      setError("請填寫標題。")
      return
    }

    const filesSnapshot = mediaSlots.map((s) => s.file)

    const createPayload = {
      title: trimmedTitle,
      caption: localCaption.trim(),
      plannedPublishDate: null as string | null,
      platform: "instagram" as const,
      contentType: "feed" as const,
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

  const helperLines = [
    "目前僅支援圖片上傳，不支援影片。",
    `每則最多 ${PLANNER_UPLOAD_MAX_FILES} 張；單檔須 ≤ ${MAX_ORIGINAL_MB}MB（壓縮前）。上傳前會將長邊縮至約 ${PLANNER_UPLOAD_MAX_EDGE}px、轉成 JPEG（壓縮後單檔約 ≤ ${MAX_OUTPUT_MB}MB）。`,
    "預覽牆為 4:5（概念上接近 1080×1350）。",
    "按下「新增貼文」後會先建立項目並關閉視窗，圖片在背景上傳；預覽牆會先出現佔位，完成後自動更新縮圖。",
  ]

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
            "flex max-h-[min(90dvh,800px)] w-[min(100vw-1rem,896px)] max-w-[min(100vw-1rem,896px)] flex-col gap-0 p-0 sm:max-w-4xl",
          )}
          showCloseButton={!pending}
          aria-busy={busy}
        >
          <DialogHeader className="border-border/50 shrink-0 space-y-2 border-b px-4 py-3 text-left sm:px-5">
            <DialogTitle className="text-base">新增貼文</DialogTitle>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-[11px] leading-relaxed sm:text-xs">
              {helperLines.map((line, i) => (
                <li key={i} className="marker:text-muted-foreground/80">
                  {line}
                </li>
              ))}
            </ul>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2 md:items-start">
              <div className="border-border/50 flex flex-col gap-2 border-b p-4 sm:p-5 md:min-h-0 md:border-b-0 md:border-r">
                <Label className="text-muted-foreground text-xs">圖片</Label>
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
                    "bg-muted/30 relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors outline-none md:min-h-[220px]",
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
                    accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml"
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
                        className="max-h-[min(40vh,320px)] w-full rounded-lg object-contain"
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
                    </div>
                  ) : (
                    <>
                      <Upload className="text-muted-foreground size-10" aria-hidden />
                      <p className="text-muted-foreground text-center text-sm">
                        拖放或點擊選擇圖片
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

              <div className="flex flex-col gap-3 p-4 sm:p-5">
                <p className="text-muted-foreground text-xs font-medium">貼文 Post</p>
                <div className="space-y-1">
                  <Label htmlFor="ig-compose-title" className="text-xs">
                    標題
                  </Label>
                  <Input
                    id="ig-compose-title"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    placeholder="必填"
                    disabled={busy}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ig-compose-caption" className="text-xs">
                    文案
                  </Label>
                  <Textarea
                    id="ig-compose-caption"
                    value={localCaption}
                    onChange={(e) => setLocalCaption(e.target.value)}
                    placeholder="選填"
                    disabled={busy}
                    rows={5}
                    className="min-h-[120px] resize-y text-sm"
                  />
                </div>

                {error ? <p className="text-destructive text-xs">{error}</p> : null}
              </div>
            </div>
          </div>

          <DialogFooter
            className={cn(
              "border-border/50 bg-muted/15 shrink-0 gap-2 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:flex-row sm:justify-end sm:px-5",
              "!mx-0 !mb-0 rounded-b-xl",
            )}
          >
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
