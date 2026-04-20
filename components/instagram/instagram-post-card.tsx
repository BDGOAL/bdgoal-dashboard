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

/** IG 動態／編排常見直向預覽比例（貼文 4:5），牆面維持一致節奏 */
const WALL_ASPECT = "aspect-[4/5]"

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
  onOpen,
  onDragStart,
  onDragOver,
  onDrop,
  isDropTarget,
  isDragSource,
  className,
}: {
  item: ContentItem
  /** Shown in corner when scheduled / has date */
  scheduleLabel?: string | null
  draggable?: boolean
  onOpen: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDropTarget?: boolean
  /** 拖曳中：來源格視覺變淡 */
  isDragSource?: boolean
  className?: string
}) {
  const display = getInstagramDisplayStatus(item)
  const thumb = getInstagramPrimaryImageUrl(item)
  const corner =
    scheduleLabel ??
    (display === "scheduled" || item.plannedPublishDate || item.scheduledAt
      ? formatScheduleCorner(item.plannedPublishDate ?? item.scheduledAt)
      : "")

  return (
    <div
      className={cn(
        "group relative w-full min-w-0 overflow-hidden",
        WALL_ASPECT,
        "bg-[#0a0a0a]",
        isDropTarget && "ring-primary/90 z-[1] ring-2 ring-inset",
        isDragSource && "opacity-[0.42] transition-opacity duration-150",
        className,
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
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

      {draggable ? (
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            onDragStart?.(e)
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-0 top-0 z-10 flex cursor-grab items-center justify-center p-1.5 text-white/90",
            "active:cursor-grabbing",
            "hover:bg-black/35",
            "focus-visible:ring-ring rounded-bl-md outline-none focus-visible:ring-2",
          )}
          role="button"
          tabIndex={0}
          aria-label="按住拖曳以調整動態順序"
          title="拖曳排序"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.preventDefault()
          }}
        >
          <GripVertical className="size-4 drop-shadow-md" aria-hidden />
        </div>
      ) : null}
    </div>
  )
}
