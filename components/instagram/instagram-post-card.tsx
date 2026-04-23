"use client"

import * as React from "react"
import { GripVertical, ImageIcon } from "lucide-react"

import type { ContentItem } from "@/lib/types/dashboard"
import {
  getInstagramDisplayStatus,
  instagramDisplayStatusBadgeClass,
  instagramDisplayStatusLabel,
} from "@/lib/instagram/instagram-display-status"
import { getInstagramPrimaryImageUrl } from "@/lib/instagram/instagram-media"
import { cn } from "@/lib/utils"

/** 規劃牆使用較緊湊 5:6 預覽；實際 IG 發佈仍以 4:5（1080×1350）為基準。 */
const WALL_ASPECT = "aspect-[3/4]"

function formatScheduleCorner(value: string | null | undefined): string {
  if (!value) return ""
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      month: "numeric",
      day: "numeric",
    }).format(new Date(value))
  } catch {
    return ""
  }
}

function GridTileImage({ url }: { url: string | null }) {
  const [broken, setBroken] = React.useState(false)
  if (!url || broken) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]"
        aria-hidden
      >
        <ImageIcon className="size-7 text-white/25" />
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

export function InstagramPostCard({
  item,
  scheduleLabel,
  draggable,
  selectable = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  setNodeRef,
  style,
  dragHandleAttributes,
  dragHandleListeners,
  onOpen,
  isDropTarget,
  isDragSource,
  className,
}: {
  item: ContentItem
  /** Shown in corner when scheduled / has date */
  scheduleLabel?: string | null
  draggable?: boolean
  selectable?: boolean
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  setNodeRef?: (element: HTMLElement | null) => void
  style?: React.CSSProperties
  dragHandleAttributes?: Record<string, unknown>
  dragHandleListeners?: Record<string, unknown>
  onOpen: () => void
  isDropTarget?: boolean
  /** 拖曳中：來源格視覺變淡 */
  isDragSource?: boolean
  className?: string
}) {
  const display = getInstagramDisplayStatus(item)
  const thumb = getInstagramPrimaryImageUrl(item)
  const caption = (item.caption ?? "").trim()
  const corner =
    scheduleLabel ??
    (display === "scheduled" || item.plannedPublishDate || item.scheduledAt
      ? formatScheduleCorner(item.plannedPublishDate ?? item.scheduledAt)
      : "")

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative w-full min-w-0 overflow-hidden",
        WALL_ASPECT,
        "bg-[#0a0a0a] ring-1 ring-white/5 transition-all duration-160 ease-out",
        "hover:-translate-y-[1px] hover:scale-[1.012] hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)] hover:ring-white/15",
        selectionMode && selectable && "cursor-pointer",
        selected && "ring-primary/80 ring-2",
        isDropTarget && "ring-primary/90 z-[2] ring-2 ring-inset",
        isDragSource && "z-[3] scale-[0.985] opacity-[0.5] shadow-[0_16px_36px_rgba(0,0,0,0.32)]",
        className,
      )}
    >
      <GridTileImage url={thumb} />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      <div className="pointer-events-none absolute left-0 top-0 z-[2] flex max-w-[min(100%,4.5rem)] flex-col p-1">
        <span
          className={cn(
            "w-fit max-w-full truncate rounded-sm px-1 py-px text-[8px] font-semibold uppercase leading-tight tracking-wide text-white/95 shadow-sm backdrop-blur-[2px]",
            instagramDisplayStatusBadgeClass(display),
            "border-0 bg-black/45",
          )}
        >
          {instagramDisplayStatusLabel[display]}
        </span>
      </div>

      {corner ? (
        <div className="pointer-events-none absolute bottom-1 right-1 z-[2] text-[9px] font-medium tabular-nums text-white/95 drop-shadow-md">
          {corner}
        </div>
      ) : null}

      {caption ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
          <div className="bg-gradient-to-t from-black/78 via-black/55 to-transparent px-2 pb-1.5 pt-5">
            <p
              className={cn(
                "text-[10px] leading-[1.35] tracking-[0.01em] text-white/88",
                "[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden",
              )}
            >
              {caption}
            </p>
          </div>
        </div>
      ) : null}

      {selectionMode ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect?.()
          }}
          disabled={!selectable}
          className={cn(
            "absolute left-1 top-1 z-[10] inline-flex size-5 items-center justify-center rounded-sm border text-[10px]",
            selectable
              ? selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/40 bg-black/45 text-white"
              : "border-white/20 bg-black/20 text-white/40",
          )}
          aria-label={selected ? "取消選取" : "選取貼文"}
        >
          {selected ? "✓" : ""}
        </button>
      ) : null}

      {/* 主要點擊區：不可 draggable，避免與 HTML5 drag 搶奪點擊導致無法開詳情 */}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "absolute inset-0 z-[5] border-0 bg-transparent p-0 outline-none",
          "cursor-pointer",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset",
        )}
        aria-label={`開啟「${item.title}」詳情（${instagramDisplayStatusLabel[display]}）`}
      />

      <button
        type="button"
        disabled={!draggable}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        // dnd-kit: drag 僅由把手啟動；不可拖曳卡片也保留同位置元素確保視覺一致。
        {...(draggable ? (dragHandleAttributes ?? {}) : {})}
        {...(draggable ? (dragHandleListeners ?? {}) : {})}
        className={cn(
          "absolute right-1 top-1 z-[12] hidden size-6 items-center justify-center rounded-md border",
          "backdrop-blur-[2px] transition-all duration-150 ease-out md:flex",
          draggable
            ? "border-white/15 bg-black/40 text-white/78 cursor-grab active:cursor-grabbing opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:border-white/30 hover:text-white"
            : "pointer-events-none border-white/10 bg-black/20 text-white/35 opacity-0 [@media(hover:none)]:opacity-0",
          "focus-visible:ring-ring/70 outline-none focus-visible:ring-2",
        )}
        aria-label={draggable ? "拖曳排序" : "此貼文不可拖曳"}
        title={draggable ? "拖曳排序" : "已發佈貼文不可拖曳"}
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
