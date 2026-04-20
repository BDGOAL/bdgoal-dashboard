"use client"

import * as React from "react"

import { ListSyncStatus } from "@/components/dashboard/async-feedback"
import { InstagramAddPostDialog } from "@/components/instagram/instagram-add-post-dialog"
import { ContentItemEditDialog } from "@/components/instagram/content-item-edit-dialog"
import { InstagramCalendarView } from "@/components/instagram/instagram-calendar-view"
import { InstagramGridView } from "@/components/instagram/instagram-grid-view"
import { InstagramPostDetailsPanel } from "@/components/instagram/instagram-post-details-panel"
import {
  InstagramViewSwitcher,
  type InstagramMainView,
} from "@/components/instagram/instagram-view-switcher"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import type { ContentItem } from "@/lib/types/dashboard"
import { fetchDashboardContentItems } from "@/lib/dashboard/fetch-dashboard-content-items-client"
import { filterContentByScope } from "@/lib/scope/filter-content"
import { filterByPlatform } from "@/lib/instagram/content-helpers"
import {
  contentItemStatusToApi,
  isInstagramPersistableItem,
  persistInstagramPlannedDateChange,
} from "@/lib/instagram/instagram-ui-persistence"
import { cn } from "@/lib/utils"

export function InstagramManager({ items }: { items: ContentItem[] }) {
  const { scope } = useWorkspaceScope()
  const [mainView, setMainView] = React.useState<InstagramMainView>("grid")
  const [loading, setLoading] = React.useState(false)
  const [editItem, setEditItem] = React.useState<ContentItem | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [detailsItem, setDetailsItem] = React.useState<ContentItem | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

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

  function openDetails(item: ContentItem) {
    setDetailsItem(item)
    setDetailsOpen(true)
  }

  function handleGridOrderChange(reorderedDraggableItems: ContentItem[]) {
    setRows((prev) => {
      const idSet = new Set(reorderedDraggableItems.map((i) => i.id))
      return [...reorderedDraggableItems, ...prev.filter((i) => !idSet.has(i.id))]
    })
  }

  function handleCalendarReschedule(prev: ContentItem, next: ContentItem) {
    setRows((r) => r.map((i) => (i.id === next.id ? next : i)))
    if (!isInstagramPersistableItem(prev)) return
    void (async () => {
      const apiStatus = contentItemStatusToApi(next.status)
      const iso = next.plannedPublishDate ?? null
      const result = await persistInstagramPlannedDateChange({
        item: prev,
        plannedPublishDateIso: iso,
        apiStatus,
      })
      if (!result.ok) await refreshRows()
    })()
  }

  return (
    <div className="flex flex-col gap-3">
      {loading ? <ListSyncStatus /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <InstagramViewSwitcher value={mainView} onValueChange={setMainView} />
        <div className="flex items-center justify-end gap-2">
          <InstagramAddPostDialog
            onAdded={() => refreshRows()}
            workspaceContentItems={items}
          />
        </div>
      </div>

      <div
        className={cn(
          "transition-opacity duration-200 ease-out",
          loading && "pointer-events-none opacity-[0.72]",
        )}
        aria-busy={loading}
      >
        {mainView === "grid" ? (
          <InstagramGridView
            items={rows}
            scope={scope}
            onRequestDetails={openDetails}
            onGridOrderChange={handleGridOrderChange}
          />
        ) : (
          <InstagramCalendarView
            items={rows}
            scope={scope}
            onRequestDetails={openDetails}
            onRescheduleItem={handleCalendarReschedule}
          />
        )}
      </div>

      <InstagramPostDetailsPanel
        item={detailsItem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onSaved={() => refreshRows()}
        onRequestFullEdit={(item) => {
          setEditItem(item)
          setEditOpen(true)
        }}
      />

      <ContentItemEditDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => refreshRows()}
      />
    </div>
  )
}
