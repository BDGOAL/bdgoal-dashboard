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
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted"
        aria-hidden
      >
        <ImageIcon className="size-8 text-muted-foreground/50" />
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
        "group relative aspect-square w-full overflow-hidden rounded-md border border-border/50 bg-muted shadow-sm transition-[box-shadow,transform] duration-150",
        isDropTarget && "ring-primary ring-2 ring-offset-2 ring-offset-background",
        className,
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        onClick={onOpen}
        onDragOver={(e) => {
          e.preventDefault()
          onDragOver?.(e)
        }}
        onDrop={(e) => {
          e.preventDefault()
          onDrop?.(e)
        }}
        className={cn(
          "absolute inset-0 z-0 text-left outline-none",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        aria-label={`${item.title}，${instagramDisplayStatusLabel[display]}`}
      />

      <GridTileImage url={thumb} />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80" />

      <div className="pointer-events-none absolute left-1.5 top-1.5 z-[1] flex max-w-[calc(100%-2.5rem)] flex-col gap-1">
        <span
          className={cn(
            "w-fit rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none backdrop-blur-sm",
            instagramDisplayStatusBadgeClass(display),
          )}
        >
          {instagramDisplayStatusLabel[display]}
        </span>
      </div>

      {corner ? (
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-[1] rounded bg-background/85 px-1 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm backdrop-blur-sm">
          {corner}
        </div>
      ) : null}

      {draggable ? (
        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            onDragStart?.(e)
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute right-1 top-1 z-[2] cursor-grab rounded-md border border-white/20 bg-black/35 p-0.5 text-white/90 backdrop-blur-sm",
            "active:cursor-grabbing",
            "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          )}
          aria-label="拖曳以重新排序"
          title="拖曳排序"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
            }
          }}
        >
          <GripVertical className="size-4" aria-hidden />
        </span>
      ) : null}
    </div>
  )
}
