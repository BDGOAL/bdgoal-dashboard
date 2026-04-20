"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ImageIcon } from "lucide-react"

import { InstagramPostCard } from "@/components/instagram/instagram-post-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import type { ContentItem } from "@/lib/types/dashboard"
import { cn } from "@/lib/utils"

/** @deprecated Use {@link getInstagramPrimaryImageUrl} from `@/lib/instagram/instagram-media` */
export function getGridImageUrl(item: ContentItem): string | null {
  const fromAttachment = item.attachments?.[0]?.url?.trim()
  if (fromAttachment) return fromAttachment
  return item.thumbnail?.trim() || null
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
  onBulkDelete,
}: {
  /** 已由 {@link InstagramManager} 篩選並排序：單一客戶 + Instagram */
  items: ContentItem[]
  clientDisplayName: string
  onRequestDetails: (item: ContentItem) => void
  /** 拖放完成後回傳完整牆面 id 順序（含已發佈） */
  onWallOrderCommit?: (orderedIds: string[]) => void
  onBulkDelete?: (ids: string[]) => void
}) {
  const ids = React.useMemo(() => items.map((i) => i.id), [items])
  const deletableIds = React.useMemo(
    () =>
      items
        .filter((i) => i.source === "manual")
        .map((i) => i.id),
    [items],
  )
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [overId, setOverId] = React.useState<string | null>(null)
  const [selectionMode, setSelectionMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  function clearDragState() {
    setActiveId(null)
    setOverId(null)
  }

  function onDragEnd(event: DragEndEvent) {
    if (selectionMode) {
      clearDragState()
      return
    }
    const { active, over } = event
    clearDragState()
    if (!over || active.id === over.id) return
    const activeCanDrag = Boolean(active.data.current?.canDrag)
    if (!activeCanDrag) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
    const nextIds = arrayMove(ids, oldIndex, newIndex)
    onWallOrderCommit?.(nextIds)
  }

  React.useEffect(() => {
    setSelectedIds((prev) => new Set([...prev].filter((id) => ids.includes(id))))
  }, [ids])

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

  function SortableCard({ item }: { item: ContentItem }) {
    const canDrag = !selectionMode && item.status !== "published"
    const sortable = useSortable({
      id: item.id,
      data: { canDrag },
    })
    const style = {
      transform: CSS.Transform.toString(sortable.transform),
      transition: sortable.transition,
    } satisfies React.CSSProperties
    return (
      <InstagramPostCard
        item={item}
        draggable={canDrag}
        selectable={item.source === "manual"}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.id)}
        onToggleSelect={() => {
          if (item.source !== "manual") return
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(item.id)) next.delete(item.id)
            else next.add(item.id)
            return next
          })
        }}
        setNodeRef={sortable.setNodeRef}
        style={style}
        dragHandleAttributes={
          canDrag
            ? (sortable.attributes as unknown as Record<string, unknown>)
            : undefined
        }
        dragHandleListeners={
          canDrag
            ? (sortable.listeners as unknown as Record<string, unknown>)
            : undefined
        }
        onOpen={() => {
          if (selectionMode) {
            if (item.source !== "manual") return
            setSelectedIds((prev) => {
              const next = new Set(prev)
              if (next.has(item.id)) next.delete(item.id)
              else next.add(item.id)
              return next
            })
            return
          }
          onRequestDetails(item)
        }}
        isDropTarget={Boolean(overId === item.id && activeId !== item.id)}
        isDragSource={Boolean(activeId === item.id)}
      />
    )
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {selectionMode ? `${selectedIds.size} selected` : `${clientDisplayName} · Grid`}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {selectionMode ? (
            <>
              <button
                type="button"
                className="border-input bg-background hover:bg-accent h-7 rounded-md border px-2 text-xs"
                onClick={() => setSelectedIds(new Set(deletableIds))}
              >
                Select all visible
              </button>
              <button
                type="button"
                className="border-input bg-background hover:bg-accent h-7 rounded-md border px-2 text-xs"
                onClick={() => {
                  setSelectionMode(false)
                  setSelectedIds(new Set())
                }}
              >
                Cancel selection
              </button>
              <button
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 rounded-md px-2 text-xs disabled:opacity-50"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  const idsToDelete = [...selectedIds]
                  if (!idsToDelete.length) return
                  if (!window.confirm(`確定刪除 ${idsToDelete.length} 則貼文？此動作無法復原。`)) return
                  onBulkDelete?.(idsToDelete)
                  setSelectedIds(new Set())
                  setSelectionMode(false)
                }}
              >
                Delete selected
              </button>
            </>
          ) : (
            <button
              type="button"
              className="border-input bg-background hover:bg-accent h-7 rounded-md border px-2 text-xs"
              onClick={() => setSelectionMode(true)}
            >
              Select
            </button>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[520px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            setActiveId(String(event.active.id))
          }}
          onDragOver={(event) => {
            setOverId(event.over ? String(event.over.id) : null)
          }}
          onDragCancel={clearDragState}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className={wallGridClass}>
              {items.map((item) => (
                <SortableCard key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
