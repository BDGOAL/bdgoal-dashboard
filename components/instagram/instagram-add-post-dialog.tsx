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
import { mockSocialAccounts } from "@/lib/mock/agency"
import { pickAccountForNewPost } from "@/lib/scope/pick-account"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"

const selectClass = cn(
  "border-input bg-background dark:bg-input/30 h-7 w-full rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

type InstagramAddPostDialogProps = {
  onAdded: () => void
}

export function InstagramAddPostDialog({ onAdded }: InstagramAddPostDialogProps) {
  const { scope } = useWorkspaceScope()
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [caption, setCaption] = React.useState("")
  const [postType, setPostType] = React.useState<ContentPostType>("feed")
  const [status, setStatus] = React.useState<"planning" | "scheduled" | "published">(
    "planning",
  )
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function reset() {
    setTitle("")
    setCaption("")
    setPostType("feed")
    setStatus("planning")
    setScheduledAt("")
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return

    let scheduledIso: string | null = null
    if (scheduledAt) {
      const d = new Date(scheduledAt)
      if (!Number.isNaN(d.getTime())) scheduledIso = d.toISOString()
    }

    const acc = pickAccountForNewPost(scope, "instagram", mockSocialAccounts)

    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/content/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          client: acc.clientId,
          platform: "instagram",
          contentType: postType,
          caption: caption.trim(),
          plannedPublishDate: status === "planning" ? null : scheduledIso,
          status,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? "新增失敗。")
        return
      }
      onAdded()
      reset()
      setOpen(false)
    } catch {
      setError("新增失敗，請稍後再試。")
    } finally {
      setSaving(false)
    }
  }

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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
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
                    onChange={(e) => setStatus(e.target.value as typeof status)}
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
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-8 text-sm"
                />
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
              <Button type="submit" size="sm" disabled={!title.trim() || saving}>
                {saving ? "儲存中..." : "加入"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
