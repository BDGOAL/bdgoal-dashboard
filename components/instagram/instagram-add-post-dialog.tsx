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
  type ContentItem,
  type ContentPostType,
} from "@/lib/types/dashboard"
import {
  contentPostTypeLabel,
} from "@/lib/instagram/labels"
import { resolveClientLabelForNewPost } from "@/lib/scope/resolve-client-label-for-new-post"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"
import {
  applyScheduledAtChangeRule,
  applyStatusChangeRule,
  toPlannedPublishDateIso,
  validateStatusAndScheduledAt,
} from "@/components/instagram/status-schedule-rules"
import {
  DialogInlineToast,
  FEEDBACK_COPY,
  PendingButtonLabel,
} from "@/components/dashboard/async-feedback"

const selectClass = cn(
  "border-input bg-background dark:bg-input/30 h-7 w-full rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

type InstagramAddPostDialogProps = {
  onAdded: () => void | Promise<void>
  /** 與 Instagram 頁相同資料源，供解析客戶名稱（不寫入 mock 帳號 id） */
  workspaceContentItems: ContentItem[]
}

type ToastState = { message: string } | null

export function InstagramAddPostDialog({
  onAdded,
  workspaceContentItems,
}: InstagramAddPostDialogProps) {
  const { scope } = useWorkspaceScope()
  const [open, setOpen] = React.useState(false)
  const [localTitle, setLocalTitle] = React.useState("")
  const [localCaption, setLocalCaption] = React.useState("")
  const [postType, setPostType] = React.useState<ContentPostType>("feed")
  const [status, setStatus] = React.useState<"planning" | "scheduled" | "published">(
    "planning",
  )
  const [localScheduledAt, setLocalScheduledAt] = React.useState("")
  const [pending, setPending] = React.useState<false | "post" | "sync">(false)
  const [error, setError] = React.useState<string | null>(null)
  const [toast, setToast] = React.useState<ToastState>(null)

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(timer)
  }, [toast])

  /** 真實客戶 id（範圍選「客戶」）時，從 API 解析顯示名供 ensureClientExists／寫入 content_items */
  const [scopeClientName, setScopeClientName] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (scope.mode !== "client") {
      setScopeClientName(null)
      return
    }
    let cancelled = false
    fetch("/api/clients", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as {
          clients?: { id: string; name: string }[]
        }
        if (!res.ok) return null
        return json.clients?.find((c) => c.id === scope.clientId)?.name ?? null
      })
      .then((name) => {
        if (!cancelled) setScopeClientName(name)
      })
      .catch(() => {
        if (!cancelled) setScopeClientName(null)
      })
    return () => {
      cancelled = true
    }
  }, [scope])

  const handleTitleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalTitle(e.target.value)
    },
    [],
  )

  const handleCaptionChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalCaption(e.target.value)
    },
    [],
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

  const busy = Boolean(pending)
  const canSubmit = React.useMemo(
    () => Boolean(localTitle.trim()) && !busy && !validateStatusAndScheduledAt(status, localScheduledAt),
    [busy, localScheduledAt, localTitle, status],
  )

  const reset = React.useCallback(() => {
    setLocalTitle("")
    setLocalCaption("")
    setPostType("feed")
    setStatus("planning")
    setLocalScheduledAt("")
    setError(null)
  }, [])

  const requestClose = React.useCallback(
    (next: boolean) => {
      if (!next && busy) return
      setOpen(next)
    },
    [busy],
  )

  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const trimmedTitle = localTitle.trim()
    const trimmedCaption = localCaption.trim()
    if (!trimmedTitle) return
    const ruleError = validateStatusAndScheduledAt(status, localScheduledAt)
    if (ruleError) {
      setError(ruleError)
      return
    }

    const plannedPublishDate = toPlannedPublishDateIso(localScheduledAt)

    const resolved = resolveClientLabelForNewPost({
      scope,
      apiClientName: scopeClientName,
      workspaceContentItems,
      platform: "instagram",
    })
    if (!resolved.ok) {
      setError(resolved.message)
      return
    }
    const clientForApi = resolved.clientLabelForApi
    const createPayload = {
      title: trimmedTitle,
      caption: trimmedCaption,
      plannedPublishDate,
      platform: "instagram" as const,
      contentType: postType,
      status,
      client: clientForApi,
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
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        const msg = json.error ?? "新增失敗。"
        setError(msg)
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
      await new Promise((resolve) => setTimeout(resolve, 700))
      reset()
      setOpen(false)
    } catch {
      const msg = "新增失敗，請稍後再試。"
      setError(msg)
    } finally {
      setPending(false)
    }
  }, [
    busy,
    localCaption,
    localScheduledAt,
    localTitle,
    onAdded,
    postType,
    reset,
    scope,
    scopeClientName,
    status,
    workspaceContentItems,
  ])

  const primaryPendingLabel =
    pending === "sync" ? FEEDBACK_COPY.addSyncing : pending === "post" ? FEEDBACK_COPY.addSubmitting : false

  const validationHint = React.useMemo(() => {
    if (busy) return null
    if (!localTitle.trim()) return "請填寫標題後再加入。"
    const ve = validateStatusAndScheduledAt(status, localScheduledAt)
    return ve ?? null
  }, [busy, localScheduledAt, localTitle, status])

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
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="gap-0 sm:max-w-md" aria-busy={busy}>
          {toast ? <DialogInlineToast type="success" message={toast.message} /> : null}
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
                  disabled={busy}
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
                  disabled={busy}
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
                    disabled={busy}
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
                    disabled={busy}
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
                  disabled={busy || status === "published"}
                  className="h-8 text-sm"
                />
                {status === "published" ? (
                  <p className="text-muted-foreground text-[11px]">
                    published 狀態不需設定排程時間。
                  </p>
                ) : null}
              </div>
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
              {validationHint && !error ? (
                <p className="text-muted-foreground text-[11px]">{validationHint}</p>
              ) : null}
            </div>
            <DialogFooter className="border-border/50 bg-muted/20 gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                className="disabled:opacity-[0.78]"
                onClick={() => requestClose(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!canSubmit}
                className="gap-1.5 disabled:opacity-[0.78]"
              >
                <PendingButtonLabel idle="加入" pending={primaryPendingLabel} />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
