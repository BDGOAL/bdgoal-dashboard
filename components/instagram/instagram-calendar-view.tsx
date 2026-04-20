"use client"

import * as React from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Pencil,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import type { ContentItem } from "@/lib/types/dashboard"
import {
  buildOccurrences,
  dateToKey,
  getMonthGridCells,
  toLocalDateKey,
  type CalendarOccurrence,
} from "@/lib/calendar/occurrences"
import {
  getInstagramDisplayStatus,
  instagramDisplayStatusBadgeClass,
  instagramDisplayStatusLabel,
} from "@/lib/instagram/instagram-display-status"
import {
  getInstagramPrimaryImageUrl,
  truncateInstagramCaption,
} from "@/lib/instagram/instagram-media"
import { applyScheduledAtChangeRule, toPlannedPublishDateIso } from "@/components/instagram/status-schedule-rules"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]
const MAX_CELL_PREVIEWS = 4

function mergeDateKeyAndTime(dateKey: string, prevIso: string | null | undefined): string {
  const prev = prevIso ? new Date(prevIso) : new Date()
  if (Number.isNaN(prev.getTime())) {
    const [y, m, d] = dateKey.split("-").map(Number)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${y}-${pad(m)}-${pad(d)}T12:00`
  }
  const [y, m, d] = dateKey.split("-").map(Number)
  const next = new Date(prev)
  next.setFullYear(y, m - 1, d)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`
}

function workflowForScheduleRule(item: ContentItem): "planning" | "scheduled" | "published" {
  if (item.status === "published") return "published"
  if (item.status === "scheduled") return "scheduled"
  return "planning"
}

function applyDateKeyToItem(item: ContentItem, dateKey: string): ContentItem {
  const prevIso = item.scheduledAt ?? item.plannedPublishDate
  const dtLocal = mergeDateKeyAndTime(dateKey, prevIso)
  const wf0 = workflowForScheduleRule(item)
  const rule = applyScheduledAtChangeRule(
    dtLocal,
    wf0 === "published" ? "planning" : wf0,
  )
  const iso = toPlannedPublishDateIso(rule.scheduledAt)
  let nextStatus: ContentItem["status"]
  if (rule.status === "published") nextStatus = "published"
  else if (rule.status === "scheduled") nextStatus = "scheduled"
  else nextStatus = item.status === "idea" ? "idea" : "draft"

  return {
    ...item,
    status: nextStatus,
    plannedPublishDate: iso,
    scheduledAt: iso,
  }
}

function groupOccurrencesByDayDeduped(
  occurrences: CalendarOccurrence[],
): Map<string, ContentItem[]> {
  const m = new Map<string, Map<string, ContentItem>>()
  for (const o of occurrences) {
    const key = toLocalDateKey(o.at)
    const inner = m.get(key) ?? new Map<string, ContentItem>()
    if (!inner.has(o.item.id)) {
      inner.set(o.item.id, o.item)
    }
    m.set(key, inner)
  }
  const out = new Map<string, ContentItem[]>()
  for (const [key, inner] of m) {
    const list = [...inner.values()].sort((a, b) => {
      const ta = new Date(a.scheduledAt ?? a.plannedPublishDate ?? 0).getTime()
      const tb = new Date(b.scheduledAt ?? b.plannedPublishDate ?? 0).getTime()
      return ta - tb
    })
    out.set(key, list)
  }
  return out
}

function CalendarChip({
  item,
  onOpen,
  onDragStart,
  onDragEnd,
  draggable,
}: {
  item: ContentItem
  onOpen: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd?: () => void
  draggable: boolean
}) {
  const url = getInstagramPrimaryImageUrl(item)
  const cap = truncateInstagramCaption(item.caption || item.title, 72)
  const display = getInstagramDisplayStatus(item)
  const [broken, setBroken] = React.useState(false)

  return (
    <div
      className={cn(
        "bg-background/95 flex gap-1.5 rounded-md border border-border/60 p-1 shadow-sm",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex min-w-0 flex-1 gap-1.5 text-left outline-none",
          "focus-visible:ring-ring rounded-sm focus-visible:ring-2",
        )}
        aria-label={`${item.title}，${instagramDisplayStatusLabel[display]}`}
      >
        <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded">
          {url && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="size-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <ImageIcon className="size-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "mb-0.5 inline-block rounded border px-1 py-px text-[9px] font-medium leading-none",
              instagramDisplayStatusBadgeClass(display),
            )}
          >
            {instagramDisplayStatusLabel[display]}
          </span>
          <p className="text-foreground line-clamp-2 text-[11px] leading-snug">{cap}</p>
        </div>
      </button>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground shrink-0 self-start rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="編輯詳情"
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  )
}

export function InstagramCalendarView({
  items,
  clientDisplayName,
  onRescheduleItem,
  onRequestDetails,
}: {
  /** 已由 {@link InstagramManager} 篩選：單一客戶 + Instagram */
  items: ContentItem[]
  clientDisplayName: string
  onRescheduleItem: (prev: ContentItem, next: ContentItem) => void
  onRequestDetails: (item: ContentItem) => void
}) {
  const [view, setView] = React.useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })

  const [dragId, setDragId] = React.useState<string | null>(null)
  const [overKey, setOverKey] = React.useState<string | null>(null)

  const baseItems = items

  const occurrences = React.useMemo(
    () => buildOccurrences(baseItems),
    [baseItems],
  )

  const byDay = React.useMemo(
    () => groupOccurrencesByDayDeduped(occurrences),
    [occurrences],
  )

  const unscheduled = React.useMemo(() => {
    return baseItems.filter((i) => {
      if (i.status === "published") return false
      return !i.scheduledAt && !i.plannedPublishDate
    })
  }, [baseItems])

  const cells = React.useMemo(
    () => getMonthGridCells(view.year, view.month),
    [view.year, view.month],
  )

  const monthLabel = React.useMemo(() => {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "long",
    }).format(new Date(view.year, view.month, 1))
  }, [view.year, view.month])

  const todayKey = dateToKey(new Date())

  const monthDayCells = React.useMemo(
    () => cells.filter((c) => c.inMonth),
    [cells],
  )

  function prevMonth() {
    setView((v) => {
      const d = new Date(v.year, v.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function nextMonth() {
    setView((v) => {
      const d = new Date(v.year, v.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function goToday() {
    const n = new Date()
    setView({ year: n.getFullYear(), month: n.getMonth() })
  }

  function onDragStartItem(item: ContentItem) {
    return (e: React.DragEvent) => {
      if (item.status === "published") return
      e.dataTransfer.setData("application/ig-item-id", item.id)
      e.dataTransfer.effectAllowed = "move"
      setDragId(item.id)
    }
  }

  function onDragEnd() {
    setDragId(null)
    setOverKey(null)
  }

  if (baseItems.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={`為「${clientDisplayName}」建立第一則 Instagram 貼文`}
        reason="此客戶目前沒有任何可顯示在行事曆上的內容。"
        suggestion="新增貼文並設定排程，或從 Asana 匯入。"
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          顯示範圍：
          <span className="text-foreground font-medium">{clientDisplayName}</span>
          <span className="text-muted-foreground"> · Instagram</span>
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={prevMonth}
            aria-label="上個月"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium"
            onClick={goToday}
          >
            今天
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={nextMonth}
            aria-label="下個月"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-foreground font-heading text-base font-semibold">{monthLabel}</h2>
        <span className="text-muted-foreground text-[11px]">拖曳貼文至其他日期以調整排程</span>
      </div>

      {unscheduled.length > 0 ? (
        <div className="border-border/60 bg-muted/25 rounded-lg border p-2">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium">
            未排程（{unscheduled.length}）
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unscheduled.map((item) => (
              <CalendarChip
                key={item.id}
                item={item}
                onOpen={() => onRequestDetails(item)}
                draggable={item.status !== "published"}
                onDragStart={onDragStartItem(item)}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Mobile：整月直向列表，每日皆可作為拖放目標 */}
      <div className="md:hidden">
        <div className="border-border/60 bg-card/40 max-h-[min(78vh,640px)] overflow-y-auto rounded-lg border">
          <ul className="divide-border/60 divide-y">
            {monthDayCells.map(({ date }) => {
              const key = dateToKey(date)
              const list = byDay.get(key) ?? []
              const label = new Intl.DateTimeFormat("zh-TW", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(date)
              return (
                <li key={key} className="p-3">
                  <p className="text-foreground mb-2 text-xs font-semibold">
                    {label}
                    {key === todayKey ? (
                      <span className="text-primary ml-2 text-[10px] font-normal">今天</span>
                    ) : null}
                  </p>
                  <div
                    className={cn(
                      "min-h-[2.5rem] space-y-2 rounded-md border border-dashed border-border/60 p-2 transition-colors",
                      list.length === 0 && "text-muted-foreground flex items-center text-[11px]",
                      overKey === key && "bg-primary/5 border-primary/40",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                      setOverKey(key)
                    }}
                    onDragLeave={() => setOverKey(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      const id = e.dataTransfer.getData("application/ig-item-id")
                      setOverKey(null)
                      setDragId(null)
                      if (!id) return
                      const prev = baseItems.find((i) => i.id === id)
                      if (!prev || prev.status === "published") return
                      const next = applyDateKeyToItem(prev, key)
                      onRescheduleItem(prev, next)
                    }}
                  >
                    {list.length === 0 ? (
                      <span>拖曳貼文至此日</span>
                    ) : null}
                    {list.map((item) => (
                      <CalendarChip
                        key={`${key}-${item.id}`}
                        item={item}
                        onOpen={() => onRequestDetails(item)}
                        draggable={item.status !== "published"}
                        onDragStart={(ev) => {
                          onDragStartItem(item)(ev)
                        }}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Desktop month grid */}
      <div
        className="border-border/60 bg-card/30 hidden overflow-hidden rounded-xl border md:block"
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-7 gap-px bg-border/50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="bg-muted/40 text-muted-foreground px-1 py-2 text-center text-[11px] font-medium"
            >
              {d}
            </div>
          ))}
          {cells.map(({ date, inMonth }) => {
            const key = dateToKey(date)
            const list = (byDay.get(key) ?? []).slice(0, MAX_CELL_PREVIEWS)
            const extra = (byDay.get(key) ?? []).length - list.length
            const isToday = key === todayKey
            return (
              <div
                key={key}
                className={cn(
                  "bg-background/80 flex min-h-[7.5rem] flex-col gap-1 p-1 transition-colors",
                  !inMonth && "bg-muted/15 opacity-60",
                  isToday && "ring-primary/35 ring-1 ring-inset",
                  overKey === key && "bg-primary/8",
                )}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                  setOverKey(key)
                }}
                onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData("application/ig-item-id")
                  setOverKey(null)
                  setDragId(null)
                  if (!id) return
                  const prev = baseItems.find((i) => i.id === id)
                  if (!prev || prev.status === "published") return
                  const next = applyDateKeyToItem(prev, key)
                  onRescheduleItem(prev, next)
                }}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    inMonth ? "text-foreground" : "text-muted-foreground",
                    isToday && "text-primary",
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                  {list.map((item) => (
                    <CalendarChip
                      key={`${key}-${item.id}`}
                      item={item}
                      onOpen={() => onRequestDetails(item)}
                      draggable={item.status !== "published"}
                      onDragStart={onDragStartItem(item)}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                  {extra > 0 ? (
                    <span className="text-muted-foreground px-0.5 text-[10px]">
                      +{extra} 則
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
