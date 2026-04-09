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

type Props = {
  item: ContentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ContentItemEditDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [status, setStatus] = React.useState<"planning" | "scheduled" | "published">(
    "planning",
  )
  const [plannedPublishDate, setPlannedPublishDate] = React.useState("")
  const [localNotes, setLocalNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!item) return
    setStatus(
      item.status === "published"
        ? "published"
        : item.status === "scheduled"
          ? "scheduled"
          : "planning",
    )
    setPlannedPublishDate(
      item.plannedPublishDate
        ? new Date(item.plannedPublishDate).toISOString().slice(0, 16)
        : "",
    )
    setLocalNotes(item.localNotes ?? "")
    setError(null)
  }, [item])

  async function save() {
    if (!item?.id.startsWith("cnt-")) {
      setError("Mock 項目不可編輯，請先使用 Asana 匯入或手動新增。")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const iso = plannedPublishDate
        ? new Date(plannedPublishDate).toISOString()
        : null
      const res = await fetch("/api/content/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status,
          plannedPublishDate: status === "planning" ? null : iso,
          localNotes,
          expectedUpdatedAt: item.updatedAt,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? "更新失敗。")
        return
      }
      onSaved()
      onOpenChange(false)
    } catch {
      setError("更新失敗，請稍後再試。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                onChange={(e) =>
                  setStatus(e.target.value as "planning" | "scheduled" | "published")
                }
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
                onChange={(e) => setPlannedPublishDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-notes" className="text-xs">
                本地備註（選填）
              </Label>
              <Textarea
                id="edit-notes"
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" size="sm" disabled={saving || !item} onClick={() => void save()}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
