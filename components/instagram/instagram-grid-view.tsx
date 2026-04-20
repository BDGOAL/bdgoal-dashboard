"use client"

import * as React from "react"
import { ImageIcon } from "lucide-react"

import { InstagramPostCard } from "@/components/instagram/instagram-post-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import type { ContentItem } from "@/lib/types/dashboard"
import { persistInstagramGridOrderPlaceholder } from "@/lib/instagram/instagram-ui-persistence"
import { cn } from "@/lib/utils"

function sortKeyNewestFirst(item: ContentItem): number {
  const raw =
    item.plannedPublishDate ?? item.scheduledAt ?? item.updatedAt ?? item.createdAt
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : 0
}

function sortPublishedKey(item: ContentItem): number {
  const raw = item.publishedAt ?? item.plannedPublishDate ?? item.updatedAt
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isFinite(t) ? t : 0
}

/** @deprecated Use {@link getInstagramPrimaryImageUrl} from `@/lib/instagram/instagram-media` */
export function getGridImageUrl(item: ContentItem): string | null {
  const fromAttachment = item.attachments?.[0]?.url?.trim()
  if (fromAttachment) return fromAttachment
  return item.thumbnail?.trim() || null
}

export function InstagramGridView({
  items,
  clientDisplayName,
  onRequestDetails,
  onGridOrderChange,
}: {
  /** 已由 {@link InstagramManager} 篩選：單一客戶 + Instagram */
  items: ContentItem[]
  clientDisplayName: string
  onRequestDetails: (item: ContentItem) => void
  onGridOrderChange?: (reorderedDraggableItems: ContentItem[]) => void
}) {
  const scopedRows = items

  const { published, draggable } = React.useMemo(() => {
    const pub = scopedRows.filter((i) => i.status === "published")
    const drag = scopedRows.filter((i) => i.status !== "published")
    pub.sort((a, b) => sortPublishedKey(b) - sortPublishedKey(a))
    drag.sort((a, b) => sortKeyNewestFirst(b) - sortKeyNewestFirst(a))
    return { published: pub, draggable: drag }
  }, [scopedRows])

  const draggableIdsSignature = React.useMemo(
    () => draggable.map((i) => i.id).join("|"),
    [draggable],
  )

  const [orderIds, setOrderIds] = React.useState<string[]>([])

  React.useEffect(() => {
    setOrderIds(draggable.map((i) => i.id))
  }, [draggableIdsSignature, draggable])

  const byId = React.useMemo(() => {
    const m = new Map<string, ContentItem>()
    for (const i of scopedRows) m.set(i.id, i)
    return m
  }, [scopedRows])

  const orderedDraggable = React.useMemo(() => {
    const seen = new Set(orderIds)
    const primary = orderIds
      .map((id) => byId.get(id))
      .filter(Boolean) as ContentItem[]
    const extras = draggable.filter((i) => !seen.has(i.id))
    return [...primary, ...extras]
  }, [orderIds, byId, draggable])

  const displayRows = React.useMemo(() => {
    return [...orderedDraggable, ...published]
  }, [orderedDraggable, published])

  const [dragSourceId, setDragSourceId] = React.useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null)

  function commitReorder(nextIds: string[]) {
    setOrderIds(nextIds)
    const nextItems = nextIds.map((id) => byId.get(id)).filter(Boolean) as ContentItem[]
    onGridOrderChange?.(nextItems)
    void persistInstagramGridOrderPlaceholder(nextItems)
  }

  function onDragStartFrom(id: string) {
    return (e: React.DragEvent) => {
      if (!draggable.some((i) => i.id === id)) return
      e.dataTransfer.setData("application/ig-grid-id", id)
      e.dataTransfer.effectAllowed = "move"
      setDragSourceId(id)
    }
  }

  function onDragOverTile(id: string) {
    return (e: React.DragEvent) => {
      if (!dragSourceId || dragSourceId === id) return
      if (!orderedDraggable.some((i) => i.id === id)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setDropTargetId(id)
    }
  }

  function onDropOnTile(targetId: string) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      const src = e.dataTransfer.getData("application/ig-grid-id") || dragSourceId
      setDragSourceId(null)
      setDropTargetId(null)
      if (!src || src === targetId) return
      if (!orderedDraggable.some((i) => i.id === src)) return
      if (!orderedDraggable.some((i) => i.id === targetId)) return
      const idxS = orderIds.indexOf(src)
      const idxT = orderIds.indexOf(targetId)
      if (idxS < 0 || idxT < 0) return
      const next = [...orderIds]
      next.splice(idxS, 1)
      next.splice(idxT, 0, src)
      commitReorder(next)
    }
  }

  function clearDragState() {
    setDragSourceId(null)
    setDropTargetId(null)
  }

  if (displayRows.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title={`為「${clientDisplayName}」建立第一則 Instagram 貼文`}
        reason="此客戶目前沒有任何 Instagram 內容。"
        suggestion="點「新增貼文」撰寫內容，或從 Asana Ready Queue 匯入。"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3" onDragEnd={clearDragState}>
      <p className="text-muted-foreground text-xs">
        顯示範圍：
        <span className="text-foreground font-medium">{clientDisplayName}</span>
        <span className="text-muted-foreground"> · Instagram</span>
      </p>
      <div
        className={cn(
          "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:gap-2.5",
          "transition-opacity duration-150",
        )}
      >
        {displayRows.map((item) => {
          const isPublished = item.status === "published"
          return (
            <InstagramPostCard
              key={item.id}
              item={item}
              draggable={!isPublished}
              onOpen={() => onRequestDetails(item)}
              onDragStart={!isPublished ? onDragStartFrom(item.id) : undefined}
              onDragOver={!isPublished ? onDragOverTile(item.id) : undefined}
              onDrop={!isPublished ? onDropOnTile(item.id) : undefined}
              isDropTarget={dropTargetId === item.id && dragSourceId !== item.id}
            />
          )
        })}
      </div>
    </div>
  )
}
