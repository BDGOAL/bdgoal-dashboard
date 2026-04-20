"use client"

import * as React from "react"

import { ListSyncStatus } from "@/components/dashboard/async-feedback"
import { InstagramAddPostDialog } from "@/components/instagram/instagram-add-post-dialog"
import { InstagramClientBar } from "@/components/instagram/instagram-client-bar"
import { ContentItemEditDialog } from "@/components/instagram/content-item-edit-dialog"
import { InstagramCalendarView } from "@/components/instagram/instagram-calendar-view"
import { InstagramGridView } from "@/components/instagram/instagram-grid-view"
import { InstagramPostDetailsPanel } from "@/components/instagram/instagram-post-details-panel"
import {
  InstagramViewSwitcher,
  type InstagramMainView,
} from "@/components/instagram/instagram-view-switcher"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import type { ContentItem } from "@/lib/types/dashboard"
import { fetchDashboardContentItems } from "@/lib/dashboard/fetch-dashboard-content-items-client"
import { filterByPlatform } from "@/lib/instagram/content-helpers"
import {
  filterInstagramItemsForClient,
  isInstagramClientScope,
} from "@/lib/instagram/instagram-scope"
import {
  contentItemStatusToApi,
  isInstagramPersistableItem,
  persistInstagramPlannedDateChange,
} from "@/lib/instagram/instagram-ui-persistence"
import { cn } from "@/lib/utils"
import { ImageIcon } from "lucide-react"

export function InstagramManager({ items }: { items: ContentItem[] }) {
  const { scope } = useWorkspaceScope()
  const clientOk = isInstagramClientScope(scope)

  const [apiClientName, setApiClientName] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!clientOk) {
      setApiClientName(null)
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
        if (!cancelled) setApiClientName(name)
      })
      .catch(() => {
        if (!cancelled) setApiClientName(null)
      })
    return () => {
      cancelled = true
    }
  }, [clientOk, scope])

  const filteredItems = React.useMemo(() => {
    if (!clientOk) return []
    return filterInstagramItemsForClient(items, scope.clientId)
  }, [items, clientOk, scope])

  const resolvedClientLabel = React.useMemo(() => {
    if (!clientOk) return null
    const fromItem = filteredItems[0]?.clientName?.trim()
    if (fromItem) return fromItem
    const fromApi = apiClientName?.trim()
    if (fromApi) return fromApi
    return `客戶 ${scope.clientId.slice(0, 8)}…`
  }, [apiClientName, clientOk, filteredItems, scope])

  const [mainView, setMainView] = React.useState<InstagramMainView>("grid")
  const [loading, setLoading] = React.useState(false)
  const [editItem, setEditItem] = React.useState<ContentItem | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [detailsItem, setDetailsItem] = React.useState<ContentItem | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const [rows, setRows] = React.useState(filteredItems)

  React.useEffect(() => {
    setRows(filteredItems)
  }, [filteredItems])

  const refreshChainRef = React.useRef(Promise.resolve())

  function refreshRows() {
    const next = refreshChainRef.current.then(async () => {
      setLoading(true)
      try {
        const all = await fetchDashboardContentItems()
        if (all) {
          if (!isInstagramClientScope(scope)) {
            setRows([])
            return
          }
          setRows(filterInstagramItemsForClient(all, scope.clientId))
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

      <InstagramClientBar clientName={resolvedClientLabel} />

      {!clientOk ? (
        <EmptyState
          icon={ImageIcon}
          title="請選擇單一客戶"
          reason="Instagram Grid 與 Calendar 只顯示一個客戶的貼文，避免混版。"
          suggestion="請在上方「範圍」或此處選擇器指定客戶；「全部客戶」無法在此頁規劃版面。"
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <InstagramViewSwitcher value={mainView} onValueChange={setMainView} />
            <div className="flex items-center justify-end gap-2">
              <InstagramAddPostDialog
                onAdded={() => refreshRows()}
                workspaceContentItems={filterByPlatform(items, "instagram")}
                apiClientName={apiClientName}
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
                clientDisplayName={resolvedClientLabel ?? "此客戶"}
                onRequestDetails={openDetails}
                onGridOrderChange={handleGridOrderChange}
              />
            ) : (
              <InstagramCalendarView
                items={rows}
                clientDisplayName={resolvedClientLabel ?? "此客戶"}
                onRequestDetails={openDetails}
                onRescheduleItem={handleCalendarReschedule}
              />
            )}
          </div>
        </>
      )}

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
