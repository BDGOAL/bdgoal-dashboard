"use client"

import * as React from "react"

import type { WorkspaceScope } from "@/lib/types/agency"
import type { ContentItem } from "@/lib/types/dashboard"
import { mockBrands, mockClients, mockSocialAccounts } from "@/lib/mock/agency"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/dashboard/empty-state"

type GridStatusFilter = "all" | "planning" | "scheduled" | "published"

function resolveClientFromScope(scope: WorkspaceScope): { id: string; name: string } | null {
  if (scope.mode === "client") {
    const c = mockClients.find((x) => x.id === scope.clientId)
    return c ? { id: c.id, name: c.name } : null
  }
  if (scope.mode === "brand") {
    const b = mockBrands.find((x) => x.id === scope.brandId)
    if (!b) return null
    const c = mockClients.find((x) => x.id === b.clientId)
    return c ? { id: c.id, name: c.name } : null
  }
  if (scope.mode === "account") {
    const a = mockSocialAccounts.find((x) => x.id === scope.accountId)
    if (!a) return null
    const c = mockClients.find((x) => x.id === a.clientId)
    return c ? { id: c.id, name: c.name } : null
  }
  return null
}

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

export function InstagramGridView({
  items,
  scope,
}: {
  items: ContentItem[]
  scope: WorkspaceScope
}) {
  const [status, setStatus] = React.useState<GridStatusFilter>("all")
  const [active, setActive] = React.useState<ContentItem | null>(null)
  const [open, setOpen] = React.useState(false)

  const selectedClient = React.useMemo(() => resolveClientFromScope(scope), [scope])

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

  if (!selectedClient) {
    return (
      <EmptyState
        title="請先選擇客戶以檢視 Instagram Grid"
        reason="Grid 僅支援單一客戶檢視，避免在同一牆混入多客戶內容。"
        suggestion="請在頁面上方「範圍」選擇一個客戶（或該客戶底下的品牌／帳號）。"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          客戶：<span className="text-foreground">{selectedClient.name}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <label htmlFor="ig-grid-status" className="text-muted-foreground text-xs">
            狀態
          </label>
          <select
            id="ig-grid-status"
            className="border-input bg-background h-8 rounded-md border px-2 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value as GridStatusFilter)}
          >
            <option value="all">全部</option>
            <option value="planning">planning</option>
            <option value="scheduled">scheduled</option>
            <option value="published">published</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="此客戶目前沒有可顯示的 Instagram 貼文"
          reason="可能是尚未匯入/建立內容，或目前狀態篩選沒有符合項目。"
          suggestion="調整狀態篩選、匯入 Asana Ready Queue，或先手動新增貼文。"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {rows.map((item) => {
            const thumb = getThumb(item)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActive(item)
                  setOpen(true)
                }}
                className="group border-border/60 bg-card/20 hover:border-primary/40 relative aspect-square overflow-hidden rounded-md border text-left"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="size-full object-cover transition group-hover:scale-[1.02]"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
                  <div className="bg-muted/40 text-muted-foreground flex size-full items-center justify-center text-xs">
                    No Image
                  </div>
                )}
                <div className="from-background/85 via-background/45 absolute inset-x-0 bottom-0 bg-gradient-to-t p-2">
                  <p className="line-clamp-2 text-xs font-medium">{item.title}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px]">
                    <span className="rounded border border-border/60 bg-background/80 px-1.5">
                      {item.source === "asana"
                        ? "Asana"
                        : item.source === "manual"
                          ? "Manual"
                          : "Mock"}
                    </span>
                    <span className="text-muted-foreground">{formatDate(item.plannedPublishDate ?? item.scheduledAt)}</span>
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
            <DialogTitle>{active?.title ?? "內容詳情"}</DialogTitle>
            <DialogDescription className="text-xs">
              Instagram Grid 項目詳情
            </DialogDescription>
          </DialogHeader>
          {active ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground text-xs">
                客戶：<span className="text-foreground">{active.clientName ?? "—"}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                排程：<span className="text-foreground">{formatDate(active.plannedPublishDate ?? active.scheduledAt)}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                狀態：<span className="text-foreground">{toPlanningStatus(active.status)}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                來源：<span className="text-foreground">{active.source === "asana" ? "Asana" : active.source === "manual" ? "Manual" : "Mock"}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                Position：<span className="text-foreground">{active.position ?? "—"}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                附件：<span className="text-foreground">{active.attachments?.length ?? 0}</span>
              </p>
              <div className="border-border/60 bg-muted/20 rounded-md border p-2">
                <p className="text-muted-foreground text-[11px]">Caption</p>
                <p className="mt-1 text-xs leading-relaxed">{active.caption || "—"}</p>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              關閉
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

