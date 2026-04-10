"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

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
import {
  CONTENT_POST_TYPES,
  type ContentPostType,
} from "@/lib/types/dashboard"
import {
  contentPostTypeLabel,
} from "@/lib/instagram/labels"
import { mockClients, mockSocialAccounts } from "@/lib/mock/agency"
import { pickAccountForNewPost } from "@/lib/scope/pick-account"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"
import {
  applyScheduledAtChangeRule,
  applyStatusChangeRule,
  toPlannedPublishDateIso,
  validateStatusAndScheduledAt,
} from "@/components/instagram/status-schedule-rules"

const selectClass = cn(
  "border-input bg-background dark:bg-input/30 h-7 w-full rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

type InstagramAddPostDialogProps = {
  onAdded: () => void
}

type ToastState = {
  type: "success" | "error"
  message: string
} | null

function useDebouncedSetter<T>(
  setter: React.Dispatch<React.SetStateAction<T>>,
  delayMs = 300,
) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return React.useCallback(
    (value: T) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setter((prev) => (Object.is(prev, value) ? prev : value))
      }, delayMs)
    },
    [delayMs, setter],
  )
}

export function InstagramAddPostDialog({ onAdded }: InstagramAddPostDialogProps) {
  const { scope } = useWorkspaceScope()
  const [open, setOpen] = React.useState(false)
  const [localTitle, setLocalTitle] = React.useState("")
  const [debouncedTitle, setDebouncedTitle] = React.useState("")
  const [localCaption, setLocalCaption] = React.useState("")
  const [debouncedCaption, setDebouncedCaption] = React.useState("")
  const [postType, setPostType] = React.useState<ContentPostType>("feed")
  const [status, setStatus] = React.useState<"planning" | "scheduled" | "published">(
    "planning",
  )
  const [localScheduledAt, setLocalScheduledAt] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<ToastState>(null)

  const debouncedSetTitle = useDebouncedSetter(setDebouncedTitle, 300)
  const debouncedSetCaption = useDebouncedSetter(setDebouncedCaption, 300)

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(timer)
  }, [toast])

  const handleTitleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setLocalTitle(value)
      debouncedSetTitle(value)
    },
    [debouncedSetTitle],
  )

  const handleCaptionChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setLocalCaption(value)
      debouncedSetCaption(value)
    },
    [debouncedSetCaption],
  )

  const handleScheduledAtChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = applyScheduledAtChangeRule(e.target.value, status)
      setLocalScheduledAt(next.scheduledAt)
      setStatus(next.status)
      setError(null)
    },
    [status],
  )

  const handleStatusChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const next = applyStatusChangeRule(e.target.value as typeof status, localScheduledAt)
      setStatus(next.status)
      setLocalScheduledAt(next.scheduledAt)
      setError(null)
    },
    [localScheduledAt],
  )

  const canSubmit = React.useMemo(
    () => Boolean(localTitle.trim()) && !isSubmitting && !validateStatusAndScheduledAt(status, localScheduledAt),
    [isSubmitting, localScheduledAt, localTitle, status],
  )

  const reset = React.useCallback(() => {
    setLocalTitle("")
    setDebouncedTitle("")
    setLocalCaption("")
    setDebouncedCaption("")
    setPostType("feed")
    setStatus("planning")
    setLocalScheduledAt("")
    setError(null)
  }, [])

  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = localTitle.trim()
    const trimmedCaption = localCaption.trim()
    if (!trimmedTitle) return
    const ruleError = validateStatusAndScheduledAt(status, localScheduledAt)
    if (ruleError) {
      setError(ruleError)
      return
    }

    const plannedPublishDate = toPlannedPublishDateIso(localScheduledAt)

    const acc = pickAccountForNewPost(scope, "instagram", mockSocialAccounts)
    const mockClientRow = mockClients.find((c) => c.id === acc.clientId)
    // Prefer display name so deriveClientId() can resolve by clients.name when DB id differs from mock ids.
    const clientForApi = (mockClientRow?.name ?? acc.clientId).trim()
    const createPayload = {
      title: trimmedTitle,
      caption: trimmedCaption,
      plannedPublishDate,
      platform: "instagram" as const,
      contentType: postType,
      status,
      client: clientForApi,
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/content/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPayload),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        const msg = json.error ?? "新增失敗。"
        setError(msg)
        setToast({ type: "error", message: msg })
        return
      }
      onAdded()
      setToast({ type: "success", message: "已成功新增貼文。" })
      // Keep dialog open briefly so success feedback is visible.
      await new Promise((resolve) => setTimeout(resolve, 700))
      reset()
      setOpen(false)
    } catch {
      const msg = "新增失敗，請稍後再試。"
      setError(msg)
      setToast({ type: "error", message: msg })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    localCaption,
    localScheduledAt,
    localTitle,
    onAdded,
    postType,
    reset,
    scope,
    status,
  ])

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="size-3.5" aria-hidden />
        新增貼文
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 sm:max-w-md">
          {toast ? (
            <div
              role="status"
              className={cn(
                "absolute right-4 top-4 z-50 rounded-md px-3 py-2 text-xs shadow-md",
                toast.type === "success"
                  ? "bg-emerald-600/95 text-white"
                  : "bg-red-600/95 text-white",
              )}
            >
              {toast.message}
            </div>
          ) : null}
          <form onSubmit={handleSubmit}>
            <DialogHeader className="border-border/50 space-y-1 border-b pb-3 text-left">
              <DialogTitle>新增貼文</DialogTitle>
              <DialogDescription className="text-xs">
                直接寫入 BDGoal 內容庫，供 Instagram/行事曆共用。
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[min(65vh,480px)] gap-3 overflow-y-auto py-3">
              <div className="space-y-1">
                <Label htmlFor="ig-d-title" className="text-xs">
                  標題
                </Label>
                <Input
                  id="ig-d-title"
                  value={localTitle}
                  onChange={handleTitleChange}
                  placeholder="貼文標題"
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ig-d-caption" className="text-xs">
                  文案
                </Label>
                <Textarea
                  id="ig-d-caption"
                  value={localCaption}
                  onChange={handleCaptionChange}
                  placeholder="主要文案（可簡短）"
                  rows={2}
                  className="min-h-[3.25rem] resize-y text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ig-d-post-type" className="text-xs">
                    類型
                  </Label>
                  <select
                    id="ig-d-post-type"
                    className={selectClass}
                    value={postType}
                    onChange={(e) =>
                      setPostType(e.target.value as ContentPostType)
                    }
                  >
                    {CONTENT_POST_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {contentPostTypeLabel[pt]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ig-d-status" className="text-xs">
                    狀態
                  </Label>
                  <select
                    id="ig-d-status"
                    className={selectClass}
                    value={status}
                    onChange={handleStatusChange}
                  >
                    <option value="planning">planning</option>
                    <option value="scheduled">scheduled</option>
                    <option value="published">published</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ig-d-scheduled" className="text-xs">
                  排程（選填）
                </Label>
                <Input
                  id="ig-d-scheduled"
                  type="datetime-local"
                  value={localScheduledAt}
                  onChange={handleScheduledAtChange}
                  disabled={status === "published"}
                  className="h-8 text-sm"
                />
                {status === "published" ? (
                  <p className="text-muted-foreground text-[11px]">
                    published 狀態不需設定排程時間。
                  </p>
                ) : null}
              </div>
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
            </div>
            <DialogFooter className="border-border/50 bg-muted/20 gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit}>
                {isSubmitting ? "儲存中..." : "加入"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
