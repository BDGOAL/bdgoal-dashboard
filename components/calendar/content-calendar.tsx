"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ContentItem, ContentPlatform } from "@/lib/types/dashboard"
import { CONTENT_PLATFORMS } from "@/lib/types/dashboard"
import { contentPlatformLabel } from "@/lib/calendar/labels"
import {
  type CalendarOccurrence,
  type CalendarEventKind,
  buildOccurrences,
  dateToKey,
  filterOccurrencesByKind,
  getMonthGridCells,
  groupOccurrencesByDateKey,
} from "@/lib/calendar/occurrences"
import { EmptyState } from "@/components/dashboard/empty-state"
import { FilterActiveChips } from "@/components/dashboard/filter-active-chips"
import { formatDateTime } from "@/lib/instagram/content-helpers"
import { contentPostTypeLabel } from "@/lib/instagram/labels"
import { filterContentByScope } from "@/lib/scope/filter-content"
import { getScopeShortLabel } from "@/lib/scope/scope-label"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

const KIND_LABEL: Record<CalendarEventKind, string> = {
  scheduled: "排程",
  published: "已發佈",
}

export function ContentCalendar({ items }: { items: ContentItem[] }) {
  const { scope } = useWorkspaceScope()

  const [view, setView] = React.useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [platform, setPlatform] = React.useState<ContentPlatform | "all">(
    "all",
  )
  const [eventKind, setEventKind] = React.useState<
    CalendarEventKind | "all"
  >("all")
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const scopedItems = React.useMemo(
    () => filterContentByScope(items, scope),
    [items, scope],
  )

  const filteredItems = React.useMemo(() => {
    if (platform === "all") return scopedItems
    return scopedItems.filter((i) => i.platform === platform)
  }, [scopedItems, platform])

  const baseOccurrences = React.useMemo(
    () => buildOccurrences(filteredItems),
    [filteredItems],
  )

  const occurrences = React.useMemo(
    () => filterOccurrencesByKind(baseOccurrences, eventKind),
    [baseOccurrences, eventKind],
  )

  const occurrencesInViewMonth = React.useMemo(() => {
    return occurrences.filter((o) => {
      const d = new Date(o.at)
      return d.getFullYear() === view.year && d.getMonth() === view.month
    })
  }, [occurrences, view.year, view.month])

  const byDay = React.useMemo(
    () => groupOccurrencesByDateKey(occurrences),
    [occurrences],
  )

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

  function openDay(key: string) {
    setSelectedKey(key)
    setSheetOpen(true)
  }

  const selectedOccurrences =
    selectedKey != null ? (byDay.get(selectedKey) ?? []) : []

  const filterChips = React.useMemo(() => {
    const items: { label: string; active: boolean }[] = [
      { label: `範圍 · ${getScopeShortLabel(scope)}`, active: true },
    ]
    if (platform !== "all") {
      items.push({
        label: `平台 · ${contentPlatformLabel[platform]}`,
        active: true,
      })
    }
    if (eventKind !== "all") {
      items.push({
        label: `事件 · ${KIND_LABEL[eventKind]}`,
        active: true,
      })
    }
    return items
  }, [scope, platform, eventKind])

  const selectClass = cn(
    "border-input bg-background dark:bg-input/30 h-8 rounded-md border px-2 text-xs shadow-none outline-none",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
  )

  if (scopedItems.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <EmptyState
          title="此工作區範圍內沒有可排程的內容"
          reason="行事曆只顯示已排程或已發佈的項目；目前範圍下沒有對應素材，或皆為靈感／草稿階段。"
          suggestion="請在頂端切換「全部客戶」、其他客戶／品牌／帳號，或先到各平台將內容排程／標記發佈。"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="cal-platform" className="text-muted-foreground text-xs">
            平台
          </label>
          <select
            id="cal-platform"
            className={selectClass}
            value={platform}
            onChange={(e) =>
              setPlatform(e.target.value as ContentPlatform | "all")
            }
          >
            <option value="all">全部</option>
            {CONTENT_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {contentPlatformLabel[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="cal-kind" className="text-muted-foreground text-xs">
            事件類型
          </label>
          <select
            id="cal-kind"
            className={selectClass}
            value={eventKind}
            onChange={(e) =>
              setEventKind(e.target.value as CalendarEventKind | "all")
            }
          >
            <option value="all">排程與已發佈</option>
            <option value="scheduled">僅排程</option>
            <option value="published">僅已發佈</option>
          </select>
        </div>
      </div>

      <FilterActiveChips items={filterChips} />

      {filteredItems.length === 0 ? (
        <EmptyState
          title="目前平台篩選沒有項目"
          reason="此客戶／品牌範圍內沒有符合所選平台的內容。"
          suggestion="將「平台」改為「全部」，或確認該品牌是否使用此平台。"
        />
      ) : baseOccurrences.length === 0 ? (
        <EmptyState
          title="尚無可顯示的排程或發佈時間"
          reason="範圍內素材仍為靈感／草稿，或尚未設定排程／發佈時間，因此行事曆沒有事件。"
          suggestion="完成草稿並設定排程，或發佈內容後再回到此頁。"
        />
      ) : occurrences.length === 0 ? (
        <EmptyState
          title="目前事件類型篩選沒有結果"
          reason="資料中有排程或發佈紀錄，但不符合「僅排程」或「僅已發佈」的條件。"
          suggestion="將「事件類型」改為「排程與已發佈」以同時顯示兩者。"
        />
      ) : null}

      {filteredItems.length > 0 &&
      baseOccurrences.length > 0 &&
      occurrences.length > 0 ? (
      <div className="border-border/60 bg-card/20 flex flex-col gap-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{monthLabel}</h2>
            {occurrences.length > 0 && occurrencesInViewMonth.length === 0 ? (
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                本月沒有事件；其他月份有 {occurrences.length}{" "}
                筆，請切換月份或調整篩選。
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={prevMonth}
              aria-label="上個月"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={nextMonth}
              aria-label="下個月"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px rounded-md bg-border/50">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="bg-muted/40 text-muted-foreground py-1.5 text-center text-[11px] font-medium"
            >
              {w}
            </div>
          ))}
          {cells.map(({ date, inMonth }) => {
            const key = dateToKey(date)
            const dayOcc = byDay.get(key) ?? []
            const maxShow = 3
            const shown = dayOcc.slice(0, maxShow)
            const more = dayOcc.length - shown.length

            return (
              <button
                key={key}
                type="button"
                onClick={() => openDay(key)}
                className={cn(
                  "bg-background hover:bg-muted/40 flex min-h-[4.5rem] flex-col items-stretch gap-0.5 p-1 text-left transition-colors",
                  !inMonth && "text-muted-foreground/50 bg-muted/15",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    inMonth ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                  {shown.map((o) => (
                    <Chip key={o.id} occurrence={o} />
                  ))}
                  {more > 0 ? (
                    <span className="text-muted-foreground pl-0.5 text-[9px]">
                      +{more}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        <div className="text-muted-foreground flex flex-wrap gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-sky-500/50 bg-sky-500/25"
              aria-hidden
            />
            排程
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-emerald-500/50 bg-emerald-500/25"
              aria-hidden
            />
            已發佈
          </span>
        </div>
      </div>
      ) : null}

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setSelectedKey(null)
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 sm:max-w-md"
          showCloseButton
        >
          <SheetHeader className="border-border/50 border-b pb-3 text-left">
            <SheetTitle>
              {selectedKey
                ? `${selectedKey.replace(/-/g, "/")} 的內容`
                : "內容"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              點選日曆上的日期；列表套用與主畫面相同的範圍與篩選。
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 overflow-y-auto px-4 py-3">
            {selectedOccurrences.length === 0 ? (
              <EmptyState
                className="border-border/50 bg-muted/10 px-3 py-6 text-left"
                title="這一天沒有事件"
                reason="在目前範圍與篩選下，此日沒有排程或已發佈紀錄。"
                suggestion="試選其他日期、切換月份，或放寬「平台／事件類型」篩選。"
              />
            ) : (
              selectedOccurrences.map((o) => (
                <DayDetailRow key={o.id} occurrence={o} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Chip({ occurrence }: { occurrence: CalendarOccurrence }) {
  const t = occurrence.item.title
  const short = t.length > 14 ? `${t.slice(0, 13)}…` : t
  const isScheduled = occurrence.kind === "scheduled"
  const source =
    occurrence.item.source === "asana"
      ? "A"
      : occurrence.item.source === "manual"
        ? "M"
        : "K"
  return (
    <span
      className={cn(
        "truncate rounded border px-1 py-px text-[9px] leading-tight",
        isScheduled
          ? "border-sky-500/40 bg-sky-500/15 text-sky-100"
          : "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
      )}
      title={t}
    >
      {source}:{short}
    </span>
  )
}

function DayDetailRow({ occurrence }: { occurrence: CalendarOccurrence }) {
  const { item, kind, at } = occurrence
  return (
    <div className="border-border/60 bg-muted/15 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium leading-snug">{item.title}</p>
        <div className="flex items-center gap-1">
          <span className="shrink-0 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] text-foreground">
            {item.source === "asana"
              ? "Asana"
              : item.source === "manual"
                ? "Manual"
                : "Mock"}
          </span>
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px]",
              kind === "scheduled"
                ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
            )}
          >
            {KIND_LABEL[kind]}
          </span>
        </div>
      </div>
      <dl className="text-muted-foreground mt-2 grid gap-1 text-xs">
        {item.clientName ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0">客戶</dt>
            <dd>{item.clientName}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="w-14 shrink-0">平台</dt>
          <dd>{contentPlatformLabel[item.platform]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-14 shrink-0">類型</dt>
          <dd>{contentPostTypeLabel[item.postType]}</dd>
        </div>
        {item.position ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0">Position</dt>
            <dd>{item.position}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="w-14 shrink-0">時間</dt>
          <dd className="text-foreground/90">{formatDateTime(at)}</dd>
        </div>
        {item.attachments?.length ? (
          <div className="flex gap-2">
            <dt className="w-14 shrink-0">附件</dt>
            <dd>{item.attachments.length}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}
