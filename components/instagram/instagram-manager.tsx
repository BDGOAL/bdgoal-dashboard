"use client"

import * as React from "react"

import { InstagramAddPostDialog } from "@/components/instagram/instagram-add-post-dialog"
import { ContentItemEditDialog } from "@/components/instagram/content-item-edit-dialog"
import { InstagramGridView } from "@/components/instagram/instagram-grid-view"
import { InstagramStatusColumn } from "@/components/instagram/instagram-status-column"
import { InstagramSummaryRow } from "@/components/instagram/instagram-summary-row"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import type { ContentItem, ContentStatus } from "@/lib/types/dashboard"
import { filterContentByScope } from "@/lib/scope/filter-content"
import { countByStatus, filterByPlatform, itemsWithStatus } from "@/lib/instagram/content-helpers"

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

  async function refreshRows() {
    setLoading(true)
    try {
      const res = await fetch("/api/content/items", { cache: "no-store" })
      const json = (await res.json()) as { items?: ContentItem[] }
      if (res.ok && json.items) {
        const next = filterContentByScope(
          filterByPlatform(json.items, "instagram"),
          scope,
        )
        setRows(next)
      }
    } finally {
      setLoading(false)
    }
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

  const backlog = itemsWithStatus(rows, "idea")
  const drafts = itemsWithStatus(rows, "draft")
  const scheduled = itemsWithStatus(rows, "scheduled")
  const published = itemsWithStatus(rows, "published")

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card/20 p-1">
        <button
          type="button"
          onClick={() => setView("workflow")}
          className={`rounded px-2.5 py-1 text-xs ${view === "workflow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Workflow
        </button>
        <button
          type="button"
          onClick={() => setView("grid")}
          className={`rounded px-2.5 py-1 text-xs ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Grid
        </button>
      </div>

      {view === "grid" ? (
        <InstagramGridView items={items} scope={scope} />
      ) : (
        <>
      <InstagramSummaryRow counts={counts} />
      <div className="flex items-center justify-end gap-2">
        <InstagramAddPostDialog onAdded={() => void refreshRows()} />
      </div>
      {loading ? <p className="text-muted-foreground text-xs">同步中...</p> : null}
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
      <ContentItemEditDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => void refreshRows()}
      />
        </>
      )}
    </div>
  )
}
