"use client"

import * as React from "react"
import { ImageIcon } from "lucide-react"

import { InstagramPostCard } from "@/components/instagram/instagram-post-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import type { ContentItem } from "@/lib/types/dashboard"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/** @deprecated Use {@link getInstagramPrimaryImageUrl} from `@/lib/instagram/instagram-media` */
export function getGridImageUrl(item: ContentItem): string | null {
  const fromAttachment = item.attachments?.[0]?.url?.trim()
  if (fromAttachment) return fromAttachment
  return item.thumbnail?.trim() || null
}

/** 將 `src` 移至 `target` 所在索引（HTML5 拖放對齊牆面順序） */
export function moveIdInList(ids: string[], src: string, target: string): string[] {
  const from = ids.indexOf(src)
  const to = ids.indexOf(target)
  if (from < 0 || to < 0 || from === to) return ids
  const next = [...ids]
  next.splice(from, 1)
  const adjustedTo = from < to ? to - 1 : to
  next.splice(adjustedTo, 0, src)
  return next
}

/**
 * 單一連續牆面：三欄 4:5（對應 IG 1080×1350 構圖），依父層傳入的持久排序顯示。
 */
const wallGridClass = cn(
  "grid w-full max-w-full min-w-0 grid-cols-3",
  "gap-0.5",
)

export function InstagramGridView({
  items,
  clientDisplayName,
  onRequestDetails,
  onWallOrderCommit,
}: {
  /** 已由 {@link InstagramManager} 篩選並排序：單一客戶 + Instagram */
  items: ContentItem[]
  clientDisplayName: string
  onRequestDetails: (item: ContentItem) => void
  /** 拖放完成後回傳完整牆面 id 順序（含已發佈） */
  onWallOrderCommit?: (orderedIds: string[]) => void
}) {
  const byId = React.useMemo(() => {
    const m = new Map<string, ContentItem>()
    for (const i of items) m.set(i.id, i)
    return m
  }, [items])

  const baseIds = React.useMemo(() => items.map((i) => i.id), [items])

  const [dragSourceId, setDragSourceId] = React.useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null)
  const [reorderMode, setReorderMode] = React.useState(false)

  const previewIds = React.useMemo(() => {
    if (!dragSourceId || !dropTargetId || dragSourceId === dropTargetId) {
      return baseIds
    }
    return moveIdInList(baseIds, dragSourceId, dropTargetId)
  }, [baseIds, dragSourceId, dropTargetId])

  const displayItems = React.useMemo(() => {
    return previewIds.map((id) => byId.get(id)).filter(Boolean) as ContentItem[]
  }, [previewIds, byId])

  function commitReorder(nextIds: string[]) {
    onWallOrderCommit?.(nextIds)
  }

  function onDragStartFrom(id: string) {
    return (e: React.DragEvent) => {
      const item = byId.get(id)
      if (!item || item.status === "published") return
      e.dataTransfer.setData("application/ig-grid-id", id)
      e.dataTransfer.effectAllowed = "move"
      setDragSourceId(id)
    }
  }

  function onDragOverTile(id: string) {
    return (e: React.DragEvent) => {
      if (!dragSourceId || dragSourceId === id) return
      if (!baseIds.includes(id)) return
      const srcItem = byId.get(dragSourceId)
      if (!srcItem || srcItem.status === "published") return
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
      const srcItem = byId.get(src)
      if (!srcItem || srcItem.status === "published") return
      if (!baseIds.includes(targetId)) return
      const next = moveIdInList(baseIds, src, targetId)
      commitReorder(next)
    }
  }

  function clearDragState() {
    setDragSourceId(null)
    setDropTargetId(null)
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title={`為「${clientDisplayName}」建立第一則 Instagram 貼文`}
        reason="此客戶目前沒有任何 Instagram 內容。"
        suggestion="點「新增貼文」加入內容。"
      />
    )
  }

  function renderCard(item: ContentItem) {
    const isPublished = item.status === "published"
    const canDrag = reorderMode && !isPublished
    return (
      <InstagramPostCard
        key={item.id}
        item={item}
        draggable={canDrag}
        interactionMode={reorderMode ? "reorder" : "view"}
        onOpen={() => onRequestDetails(item)}
        onDragStart={canDrag ? onDragStartFrom(item.id) : undefined}
        onDragOver={onDragOverTile(item.id)}
        onDrop={onDropOnTile(item.id)}
        isDropTarget={
          dropTargetId === item.id &&
          dragSourceId != null &&
          dragSourceId !== item.id
        }
        isDragSource={Boolean(canDrag && dragSourceId === item.id)}
      />
    )
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2" onDragEnd={clearDragState}>
      <div className="flex items-center justify-end">
        <Button
          type="button"
          size="sm"
          variant={reorderMode ? "default" : "outline"}
          className="h-8 px-2 text-xs"
          onClick={() => {
            clearDragState()
            setReorderMode((v) => !v)
          }}
        >
          {reorderMode ? "完成排序" : "調整排序"}
        </Button>
      </div>
      <div className="mx-auto w-full max-w-[520px]">
        <div className={wallGridClass}>{displayItems.map((item) => renderCard(item))}</div>
      </div>
    </div>
  )
}
