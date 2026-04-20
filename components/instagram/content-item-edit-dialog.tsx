"use client"

import * as React from "react"

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
import type { ContentItem } from "@/lib/types/dashboard"
import {
  applyScheduledAtChangeRule,
  applyStatusChangeRule,
  toPlannedPublishDateIso,
  validateStatusAndScheduledAt,
  type ContentWorkflowStatus,
} from "@/components/instagram/status-schedule-rules"
import {
  DialogInlineToast,
  FEEDBACK_COPY,
  PendingButtonLabel,
} from "@/components/dashboard/async-feedback"
import { contentItemPlannedInputValue } from "@/lib/instagram/datetime-local"
import { isInstagramPersistableItem } from "@/lib/instagram/instagram-ui-persistence"

type Props = {
  item: ContentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
}

type ToastState = { message: string } | null

export function ContentItemEditDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [status, setStatus] = React.useState<ContentWorkflowStatus>("planning")
  const [plannedPublishDate, setPlannedPublishDate] = React.useState("")
  const [localNotes, setLocalNotes] = React.useState("")
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
    setStatus(item.status === "published" ? "published" : item.status === "scheduled" ? "scheduled" : "planning")
    setPlannedPublishDate(contentItemPlannedInputValue(item))
    setLocalNotes(item.localNotes ?? "")
    setError(null)
    setToast(null)
  }, [item])

  function requestClose(next: boolean) {
    if (!next && pending) return
    onOpenChange(next)
  }

  async function save() {
    if (pending) return
    if (!item || !isInstagramPersistableItem(item)) {
      setError("此項目無法由此儲存（示範資料或不受支援的 id）。")
      return
    }
    setPending("save")
    setError(null)
    setToast(null)
    try {
      const ruleError = validateStatusAndScheduledAt(status, plannedPublishDate)
      if (ruleError) {
        setError(ruleError)
        return
      }
      const iso = toPlannedPublishDateIso(plannedPublishDate)
      const res = await fetch("/api/content/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status,
          plannedPublishDate: iso,
          localNotes,
          expectedUpdatedAt: item.updatedAt,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        const msg = json.error ?? "更新失敗。"
        setError(msg)
        return
      }
      if (typeof window !== "undefined" && item) {
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
      await new Promise((r) => setTimeout(r, 520))
      onOpenChange(false)
    } catch {
      const msg = "更新失敗，請稍後再試。"
      setError(msg)
    } finally {
      setPending(false)
    }
  }

  const busy = Boolean(pending)
  const primaryPendingLabel =
    pending === "sync" ? FEEDBACK_COPY.editSyncing : pending === "save" ? FEEDBACK_COPY.editSaving : false

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="sm:max-w-md" aria-busy={busy}>
        {toast ? <DialogInlineToast type="success" message={toast.message} /> : null}
        <DialogHeader>
          <DialogTitle>編輯內容項目</DialogTitle>
          <DialogDescription className="text-xs">
            可編輯 Dashboard 管理欄位：狀態、排程時間與本地備註。
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <div className="grid gap-3">
            <div className="text-muted-foreground text-xs">
              <p className="text-foreground">{item.title}</p>
              <p className="mt-0.5">
                來源：{item.source === "asana" ? "Asana" : item.source === "manual" ? "Manual" : "Mock"}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-status" className="text-xs">
                狀態
              </Label>
              <select
                id="edit-status"
                className="border-input bg-background h-8 rounded-md border px-2 text-xs"
                value={status}
                disabled={busy}
                onChange={(e) => {
                  const next = applyStatusChangeRule(
                    e.target.value as ContentWorkflowStatus,
                    plannedPublishDate,
                  )
                  setStatus(next.status)
                  setPlannedPublishDate(next.scheduledAt)
                  setError(null)
                }}
              >
                <option value="planning">planning</option>
                <option value="scheduled">scheduled</option>
                <option value="published">published</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-planned" className="text-xs">
                排程時間
              </Label>
              <Input
                id="edit-planned"
                type="datetime-local"
                value={plannedPublishDate}
                disabled={busy || status === "published"}
                onChange={(e) => {
                  const next = applyScheduledAtChangeRule(e.target.value, status)
                  setPlannedPublishDate(next.scheduledAt)
                  setStatus(next.status)
                  setError(null)
                }}
                className="h-8 text-sm"
              />
              {status === "published" ? (
                <p className="text-muted-foreground text-[11px]">
                  published 狀態不需設定排程時間。
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-notes" className="text-xs">
                本地備註（選填）
              </Label>
              <Textarea
                id="edit-notes"
                value={localNotes}
                disabled={busy}
                onChange={(e) => setLocalNotes(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
        ) : null}
        <DialogFooter>
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
            type="button"
            size="sm"
            disabled={busy || !item}
            className="gap-1.5 disabled:opacity-[0.78]"
            onClick={() => void save()}
          >
            <PendingButtonLabel idle="儲存" pending={primaryPendingLabel} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
