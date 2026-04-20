"use client"

import * as React from "react"
import { ImageIcon } from "lucide-react"

import type { ContentItem } from "@/lib/types/dashboard"
import {
  getInstagramDisplayStatus,
  instagramDisplayStatusBadgeClass,
  instagramDisplayStatusLabel,
} from "@/lib/instagram/instagram-display-status"
import { getInstagramPrimaryImageUrl } from "@/lib/instagram/instagram-media"
import { cn } from "@/lib/utils"

/** 規劃牆使用較緊湊 5:6 預覽；實際 IG 發佈仍以 4:5（1080×1350）為基準。 */
const WALL_ASPECT = "aspect-[5/6]"

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
  interactionMode = "view",
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
  interactionMode?: "view" | "reorder"
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
        interactionMode === "reorder" && draggable && "cursor-grab active:cursor-grabbing",
        isDropTarget && "ring-primary z-[2] ring-2 ring-inset",
        isDragSource && "z-[3] scale-[0.97] opacity-[0.45] shadow-xl transition duration-150",
        className,
      )}
      draggable={Boolean(draggable && interactionMode === "reorder")}
      onDragStart={draggable && interactionMode === "reorder" ? onDragStart : undefined}
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
          interactionMode === "reorder" && "pointer-events-none",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset",
        )}
        aria-label={`開啟「${item.title}」詳情（${instagramDisplayStatusLabel[display]}）`}
      />
    </div>
  )
}
