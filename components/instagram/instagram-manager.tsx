"use client"

import * as React from "react"

import { ListSyncStatus } from "@/components/dashboard/async-feedback"
import { InstagramAddPostDialog } from "@/components/instagram/instagram-add-post-dialog"
import { ContentItemEditDialog } from "@/components/instagram/content-item-edit-dialog"
import { InstagramGridView } from "@/components/instagram/instagram-grid-view"
import { InstagramStatusColumn } from "@/components/instagram/instagram-status-column"
import { InstagramSummaryRow } from "@/components/instagram/instagram-summary-row"
import { ViewModeToggle } from "@/components/dashboard/view-mode-toggle"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import type { ContentItem, ContentStatus } from "@/lib/types/dashboard"
import { fetchDashboardContentItems } from "@/lib/dashboard/fetch-dashboard-content-items-client"
import { filterContentByScope } from "@/lib/scope/filter-content"
import { countByStatus, filterByPlatform, itemsWithStatus } from "@/lib/instagram/content-helpers"
import { cn } from "@/lib/utils"

export function InstagramManager({ items }: { items: ContentItem[] }) {
  const { scope } = useWorkspaceScope()
  const [view, setView] = React.useState<"workflow" | "grid">("workflow")
  const [loading, setLoading] = React.useState(false)
  const [editItem, setEditItem] = React.useState<ContentItem | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  const scoped = React.useMemo(() => {
    return filterContentByScope(filterByPlatform(items, "instagram"), scope)
  }, [items, scope])

  const [rows, setRows] = React.useState(scoped)

  React.useEffect(() => {
    setRows(scoped)
  }, [scoped])

  const refreshChainRef = React.useRef(Promise.resolve())

  function refreshRows() {
    const next = refreshChainRef.current.then(async () => {
      setLoading(true)
      try {
        const all = await fetchDashboardContentItems()
        if (all) {
          const scopedNext = filterContentByScope(
            filterByPlatform(all, "instagram"),
            scope,
          )
          setRows(scopedNext)
        } else {
          throw new Error(
            "\u7121\u6cd5\u8207\u4f3a\u670d\u5668\u540c\u6b65\u5217\u8868\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002",
          )
        }
      } finally {
        setLoading(false)
      }
    })
    refreshChainRef.current = next.catch(() => {})
    return next
  }

  const counts = React.useMemo(() => {
    const c = {} as Record<ContentStatus, number>
    const statuses: ContentStatus[] = [
      "idea",
      "draft",
      "scheduled",
      "published",
    ]
    for (const s of statuses) {
      c[s] = countByStatus(rows, s)
    }
    return c
  }, [rows])

  const { backlog, drafts, scheduled, published } = React.useMemo(() => {
    return {
      backlog: itemsWithStatus(rows, "idea"),
      drafts: itemsWithStatus(rows, "draft"),
      scheduled: itemsWithStatus(rows, "scheduled"),
      published: itemsWithStatus(rows, "published"),
    }
  }, [rows])

  return (
    <div className="flex flex-col gap-3">
      {loading ? <ListSyncStatus /> : null}
      <ViewModeToggle
        aria-label={"Instagram \u6aa2\u8996\u6a21\u5f0f"}
        value={view}
        onValueChange={(v) => setView(v as "workflow" | "grid")}
        options={[
          { value: "workflow", label: "Workflow" },
          { value: "grid", label: "Grid" },
        ]}
      />

      {view === "grid" ? (
        <div
          className={cn(
            "flex flex-col gap-3 transition-opacity duration-150",
            loading && "pointer-events-none opacity-[0.72]",
          )}
          aria-busy={loading}
        >
        <InstagramGridView
          items={rows}
          scope={scope}
          onRequestEdit={(item) => {
            setEditItem(item)
            setEditOpen(true)
          }}
        />
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3 transition-opacity duration-150",
            loading && "pointer-events-none opacity-[0.72]",
          )}
          aria-busy={loading}
        >
      <InstagramSummaryRow counts={counts} />
      <div className="flex items-center justify-end gap-2">
        <InstagramAddPostDialog
          onAdded={() => refreshRows()}
          workspaceContentItems={items}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4 xl:items-start">
        <InstagramStatusColumn
          title="靈感／待辦"
          status="idea"
          count={backlog.length}
          items={backlog}
          onEdit={(item) => {
            setEditItem(item)
            setEditOpen(true)
          }}
        />
        <InstagramStatusColumn
          title="草稿"
          status="draft"
          count={drafts.length}
          items={drafts}
          onEdit={(item) => {
            setEditItem(item)
            setEditOpen(true)
          }}
        />
        <InstagramStatusColumn
          title="已排程"
          status="scheduled"
          count={scheduled.length}
          items={scheduled}
          onEdit={(item) => {
            setEditItem(item)
            setEditOpen(true)
          }}
        />
        <InstagramStatusColumn
          title="已發佈"
          status="published"
          count={published.length}
          items={published}
          onEdit={(item) => {
            setEditItem(item)
            setEditOpen(true)
          }}
        />
      </div>
        </div>
      )}
      <ContentItemEditDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => refreshRows()}
      />
    </div>
  )
}
