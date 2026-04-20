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
}: {
  /** 已由 {@link InstagramManager} 篩選並排序：單一客戶 + Instagram */
  items: ContentItem[]
  clientDisplayName: string
  onRequestDetails: (item: ContentItem) => void
  /** 拖放完成後回傳完整牆面 id 順序（含已發佈） */
  onWallOrderCommit?: (orderedIds: string[]) => void
}) {
  const ids = React.useMemo(() => items.map((i) => i.id), [items])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [overId, setOverId] = React.useState<string | null>(null)
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
    const { active, over } = event
    clearDragState()
    if (!over || active.id === over.id) return
    const activeCanDrag = Boolean(active.data.current?.canDrag)
    if (!activeCanDrag) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
    onWallOrderCommit?.(arrayMove(ids, oldIndex, newIndex))
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

  function SortableCard({ item }: { item: ContentItem }) {
    const canDrag = item.status !== "published"
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
        onOpen={() => onRequestDetails(item)}
        isDropTarget={Boolean(overId === item.id && activeId !== item.id)}
        isDragSource={Boolean(activeId === item.id)}
      />
    )
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-2">
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
