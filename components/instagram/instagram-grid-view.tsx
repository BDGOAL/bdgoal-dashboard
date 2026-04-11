"use client"

import * as React from "react"
import { ImageIcon, PencilLine } from "lucide-react"

import type { WorkspaceScope } from "@/lib/types/agency"
import type { ContentItem, ContentStatus } from "@/lib/types/dashboard"
import { resolveClientForInstagramGrid } from "@/lib/scope/resolve-client-for-grid"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/dashboard/empty-state"
import { dashboardSelectClassName } from "@/lib/dashboard/form-controls"
import { contentPlatformLabel } from "@/lib/calendar/labels"
import { contentPostTypeLabel, contentStatusLabel } from "@/lib/instagram/labels"
import { cn } from "@/lib/utils"

const t = {
  gridNeedClientTitle:
    "\u8acb\u5148\u9078\u64c7\u5ba2\u6236\u4ee5\u6aa2\u8996 Instagram Grid",
  gridNeedClientReason:
    "Grid \u50c5\u652f\u63f4\u55ae\u4e00\u5ba2\u6236\u6aa2\u8996\uff0c\u907f\u514d\u5728\u540c\u4e00\u7246\u9762\u6df7\u5165\u591a\u5ba2\u6236\u5167\u5bb9\u3002",
  gridNeedClientSuggestion:
    "\u8acb\u5728\u9801\u9762\u4e0a\u65b9\u300c\u7bc4\u570d\u300d\u9078\u64c7\u4e00\u500b\u5ba2\u6236\uff08\u6216\u8a72\u5ba2\u6236\u5e95\u4e0b\u7684\u54c1\u724c\uff0f\u5e33\u865f\uff09\u3002",
  clientLabel: "\u5ba2\u6236\uff1a",
  statusFilterLabel: "\u72c0\u614b",
  planningOption: "\u898f\u5283\u4e2d\uff08\u9748\u611f\uff0f\u8349\u7a3f\uff09",
  emptyGridTitle:
    "\u6b64\u5ba2\u6236\u76ee\u524d\u6c92\u6709\u53ef\u986f\u793a\u7684 Instagram \u8cbc\u6587",
  emptyGridReason:
    "\u53ef\u80fd\u662f\u5c1a\u672a\u532f\u5165\uff0f\u5efa\u7acb\u5167\u5bb9\uff0c\u6216\u76ee\u524d\u72c0\u614b\u7be9\u9078\u6c92\u6709\u7b26\u5408\u9805\u76ee\u3002",
  emptyGridSuggestion:
    "\u8abf\u6574\u72c0\u614b\u7be9\u9078\u3001\u532f\u5165 Asana Ready Queue\uff0c\u6216\u5148\u624b\u52d5\u65b0\u589e\u8cbc\u6587\u3002",
  noThumb: "\u5c1a\u672a\u8a2d\u5b9a\u4e3b\u8996\u89ba",
  previewHint: "\u6aa2\u8996",
  detailFallback: "\u5167\u5bb9\u8a73\u60c5",
  clientField: "\u5ba2\u6236\uff1a",
  scheduleField: "\u6392\u7a0b\uff1a",
  statusField: "\u72c0\u614b\uff1a",
  sourceField: "\u4f86\u6e90\uff1a",
  editContent: "\u7de8\u8f2f\u5167\u5bb9",
  close: "\u95dc\u9589",
} as const

type GridStatusFilter = "all" | "planning" | "scheduled" | "published"

function toPlanningStatus(status: ContentItem["status"]): GridStatusFilter {
  if (status === "scheduled") return "scheduled"
  if (status === "published") return "published"
  return "planning"
}

function getThumb(item: ContentItem): string | null {
  const fromAttachment = item.attachments?.[0]?.url
  if (fromAttachment) return fromAttachment
  return item.thumbnail
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function statusBadgeClasses(status: ContentStatus): string {
  switch (status) {
    case "idea":
      return "border-amber-500/45 bg-amber-500/15 text-amber-100"
    case "draft":
      return "border-sky-500/40 bg-sky-500/12 text-sky-100"
    case "scheduled":
      return "border-violet-500/45 bg-violet-500/12 text-violet-100"
    case "published":
      return "border-emerald-500/45 bg-emerald-500/12 text-emerald-100"
    default:
      return "border-border/60 bg-background/80 text-foreground"
  }
}

function sourceLabel(item: ContentItem): string {
  if (item.source === "asana") return "Asana"
  if (item.source === "manual") return "Manual"
  return "Mock"
}

export function InstagramGridView({
  items,
  scope,
  onRequestEdit,
}: {
  items: ContentItem[]
  scope: WorkspaceScope
  onRequestEdit?: (item: ContentItem) => void
}) {
  const [status, setStatus] = React.useState<GridStatusFilter>("all")
  const [active, setActive] = React.useState<ContentItem | null>(null)
  const [open, setOpen] = React.useState(false)
  const [flashId, setFlashId] = React.useState<string | null>(null)

  const selectedClient = React.useMemo(
    () => resolveClientForInstagramGrid(scope, items),
    [scope, items],
  )

  const rows = React.useMemo(() => {
    if (!selectedClient) return []
    const base = items.filter(
      (i) => i.clientId === selectedClient.id && i.platform === "instagram",
    )
    const byStatus =
      status === "all" ? base : base.filter((i) => toPlanningStatus(i.status) === status)

    return [...byStatus].sort((a, b) => {
      const da = new Date(a.plannedPublishDate ?? a.scheduledAt ?? a.updatedAt).getTime()
      const db = new Date(b.plannedPublishDate ?? b.scheduledAt ?? b.updatedAt).getTime()
      return db - da
    })
  }, [items, selectedClient, status])

  function openItem(item: ContentItem) {
    setActive(item)
    setOpen(true)
  }

  function triggerFlash(id: string) {
    setFlashId(id)
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 1400)
  }

  React.useEffect(() => {
    function onItemUpdated(e: Event) {
      const detail = (e as CustomEvent<{ id?: string }>).detail
      if (detail?.id) triggerFlash(detail.id)
    }
    window.addEventListener("bdgoal:content-item-updated", onItemUpdated)
    return () => window.removeEventListener("bdgoal:content-item-updated", onItemUpdated)
  }, [])

  if (!selectedClient) {
    return (
      <EmptyState
        icon={ImageIcon}
        title={t.gridNeedClientTitle}
        reason={t.gridNeedClientReason}
        suggestion={t.gridNeedClientSuggestion}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          {t.clientLabel}
          <span className="text-foreground font-medium">{selectedClient.name}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="ig-grid-status" className="text-muted-foreground shrink-0 text-xs">
            {t.statusFilterLabel}
          </label>
          <select
            id="ig-grid-status"
            className={cn(dashboardSelectClassName, "min-w-[9rem]")}
            value={status}
            onChange={(e) => setStatus(e.target.value as GridStatusFilter)}
          >
            <option value="all">
              {"\u5168\u90e8"}
            </option>
            <option value="planning">{t.planningOption}</option>
            <option value="scheduled">
              {"\u5df2\u6392\u7a0b"}
            </option>
            <option value="published">
              {"\u5df2\u767c\u4f48"}
            </option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={t.emptyGridTitle}
          reason={t.emptyGridReason}
          suggestion={t.emptyGridSuggestion}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((item) => {
            const thumb = getThumb(item)
            const captionPreview = item.caption?.trim() || "—"
            const isFlash = flashId === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className={cn(
                  "group border-border/60 bg-card/15 relative flex aspect-[4/5] w-full max-w-md flex-col overflow-hidden rounded-xl border text-left shadow-none transition",
                  "hover:border-primary/45 hover:bg-card/25 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  "sm:max-w-none",
                  isFlash &&
                    "ring-primary/50 animate-pulse ring-2 ring-offset-2 ring-offset-background",
                )}
              >
                <div className="relative min-h-0 flex-[58%] overflow-hidden bg-gradient-to-b from-muted/30 to-muted/5">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="text-muted-foreground/80 flex size-full flex-col items-center justify-center gap-2 px-4 text-center">
                      <ImageIcon className="size-8 opacity-50" aria-hidden />
                      <span className="text-[11px] leading-snug">{t.noThumb}</span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-90" />
                  <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
                    <span className="rounded-md border border-white/15 bg-black/45 px-1.5 py-px text-[10px] font-medium text-white/95 backdrop-blur-sm">
                      {contentPlatformLabel[item.platform]}
                    </span>
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-px text-[10px] font-medium backdrop-blur-sm",
                        statusBadgeClasses(item.status),
                      )}
                    >
                      {contentStatusLabel[item.status]}
                    </span>
                  </div>
                  <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="border-border/60 bg-background/90 text-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm">
                      <PencilLine className="size-3" aria-hidden />
                      {t.previewHint}
                    </span>
                  </div>
                </div>

                <div className="border-border/50 flex min-h-0 flex-[42%] flex-col gap-1.5 border-t bg-card/35 p-2.5">
                  <p className="text-foreground line-clamp-1 text-xs font-semibold leading-snug">
                    {item.title}
                  </p>
                  <p className="text-muted-foreground line-clamp-3 text-[11px] leading-relaxed">
                    {captionPreview}
                  </p>
                  <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/40 pt-2 text-[10px]">
                    <span className="rounded border border-border/50 bg-muted/25 px-1.5 py-px">
                      {item.contentTypeName?.trim() || contentPostTypeLabel[item.postType]}
                    </span>
                    <span className="tabular-nums">
                      {formatDate(item.plannedPublishDate ?? item.scheduledAt)}
                    </span>
                    <span className="rounded border border-border/50 bg-background/60 px-1.5 py-px">
                      {sourceLabel(item)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{active?.title ?? t.detailFallback}</DialogTitle>
            <DialogDescription className="text-xs">
              {"Instagram Grid \u9805\u76ee\u8a73\u60c5"}
            </DialogDescription>
          </DialogHeader>
          {active ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground text-xs">
                {t.clientField}
                <span className="text-foreground">{active.clientName ?? "—"}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {t.scheduleField}
                <span className="text-foreground">
                  {formatDate(active.plannedPublishDate ?? active.scheduledAt)}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">
                {t.statusField}
                <span className="text-foreground">{contentStatusLabel[active.status]}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {t.sourceField}
                <span className="text-foreground">{sourceLabel(active)}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                Position：
                <span className="text-foreground">{active.position ?? "—"}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {"\u9644\u4ef6\uff1a"}
                <span className="text-foreground">{active.attachments?.length ?? 0}</span>
              </p>
              <div className="border-border/60 bg-muted/20 rounded-md border p-2">
                <p className="text-muted-foreground text-[11px]">Caption</p>
                <p className="mt-1 text-xs leading-relaxed">{active.caption || "—"}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            {active && onRequestEdit ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setOpen(false)
                  onRequestEdit(active)
                }}
              >
                {t.editContent}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
