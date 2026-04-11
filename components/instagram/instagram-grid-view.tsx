"use client"

import * as React from "react"
import { ImageIcon } from "lucide-react"

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
import { contentStatusLabel } from "@/lib/instagram/labels"
import { cn } from "@/lib/utils"

const t = {
  gridNeedClientTitle: "請先選擇客戶以檢視 Instagram Grid",
  gridNeedClientReason:
    "Grid 僅支援單一客戶檢視，模擬該帳號的貼文牆。",
  gridNeedClientSuggestion:
    "請在頁面上方「範圍」選擇一個客戶。",
  clientLabel: "客戶：",
  statusFilterLabel: "狀態",
  planningOption: "規劃中（靈感／草稿）",
  emptyGridTitle: "此客戶目前沒有可顯示的 Instagram 貼文",
  emptyGridReason: "可能尚未匯入／建立內容，或狀態篩選沒有符合項目。",
  emptyGridSuggestion: "調整狀態篩選、匯入 Ready Queue，或手動新增貼文。",
  detailFallback: "內容詳情",
  clientField: "客戶：",
  scheduleField: "排程：",
  statusField: "狀態：",
  sourceField: "來源：",
  editContent: "編輯內容",
  close: "關閉",
} as const

type GridStatusFilter = "all" | "planning" | "scheduled" | "published"

function toPlanningStatus(status: ContentItem["status"]): GridStatusFilter {
  if (status === "scheduled") return "scheduled"
  if (status === "published") return "published"
  return "planning"
}

/** 牆面排序：新 → 舊（左上先放最新） */
function sortKeyNewestFirst(item: ContentItem): number {
  const raw =
    item.plannedPublishDate ?? item.scheduledAt ?? item.updatedAt ?? item.createdAt
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : 0
}

export function getGridImageUrl(item: ContentItem): string | null {
  const fromAttachment = item.attachments?.[0]?.url?.trim()
  if (fromAttachment) return fromAttachment
  return item.thumbnail?.trim() || null
}

function formatScheduleShort(value: string | null | undefined): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
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
      return "border-amber-500/45 bg-amber-500/20 text-amber-50"
    case "draft":
      return "border-sky-500/40 bg-sky-500/15 text-sky-50"
    case "scheduled":
      return "border-violet-500/45 bg-violet-500/15 text-violet-50"
    case "published":
      return "border-emerald-500/45 bg-emerald-500/15 text-emerald-50"
    default:
      return "border-border/60 bg-background/90 text-foreground"
  }
}

function sourceLabel(item: ContentItem): string {
  if (item.source === "asana") return "Asana"
  if (item.source === "manual") return "Manual"
  return "Mock"
}

function GridTileImage({ url }: { url: string | null }) {
  const [broken, setBroken] = React.useState(false)
  if (!url || broken) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted"
        aria-hidden
      >
        <ImageIcon className="size-8 text-muted-foreground/50" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="absolute inset-0 size-full object-cover"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
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

    return [...byStatus].sort(
      (a, b) => sortKeyNewestFirst(b) - sortKeyNewestFirst(a),
    )
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
            <option value="all">全部</option>
            <option value="planning">{t.planningOption}</option>
            <option value="scheduled">已排程</option>
            <option value="published">已發佈</option>
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
        <div className="mx-auto w-full max-w-[min(100%,470px)]">
          <div className="grid grid-cols-3 gap-1">
            {rows.map((item) => {
              const thumb = getGridImageUrl(item)
              const schedule =
                item.plannedPublishDate ?? item.scheduledAt ?? item.publishedAt
              const isFlash = flashId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    "group relative aspect-square w-full overflow-hidden bg-muted text-left outline-none",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isFlash && "ring-primary/60 animate-pulse ring-2 ring-inset",
                  )}
                  aria-label={`${item.title} · ${contentStatusLabel[item.status]}`}
                >
                  <GridTileImage url={thumb} />

                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-end bg-black/50 p-2 opacity-0 transition-opacity",
                      "group-hover:opacity-100 group-focus-visible:opacity-100",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 w-fit rounded border px-1.5 py-0.5 text-[10px] font-medium",
                        statusBadgeClasses(item.status),
                      )}
                    >
                      {contentStatusLabel[item.status]}
                    </span>
                    <span className="text-[10px] font-medium tabular-nums text-white/95">
                      {formatScheduleShort(schedule)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{active?.title ?? t.detailFallback}</DialogTitle>
            <DialogDescription className="text-xs">Instagram 貼文詳情</DialogDescription>
          </DialogHeader>
          {active ? (
            <div className="space-y-2 text-sm">
              {getGridImageUrl(active) ? (
                <div className="bg-muted relative aspect-square w-full max-w-sm overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getGridImageUrl(active)!}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
              ) : null}
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
                附件：
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
