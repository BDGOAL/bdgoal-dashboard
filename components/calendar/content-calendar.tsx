"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { ListSyncStatus } from "@/components/dashboard/async-feedback"
import { EmptyState } from "@/components/dashboard/empty-state"
import { FilterActiveChips } from "@/components/dashboard/filter-active-chips"
import { dashboardSelectClassName } from "@/lib/dashboard/form-controls"
import { formatDateTime } from "@/lib/instagram/content-helpers"
import { contentPostTypeLabel, contentStatusLabel } from "@/lib/instagram/labels"
import { filterContentByScope } from "@/lib/scope/filter-content"
import { getScopeShortLabel } from "@/lib/scope/scope-label"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

const KIND_LABEL: Record<CalendarEventKind, string> = {
  scheduled: "排程",
  published: "已發佈",
}

const PLATFORM_ABBR: Record<ContentPlatform, string> = {
  instagram: "IG",
  youtube: "YT",
  tiktok: "TT",
  x: "X",
  threads: "TH",
}

const MAX_CHIPS_IN_CELL = 2

function formatSheetDateTitle(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat("zh-TW", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

function canUsePipelineEditor(
  item: ContentItem,
  onRequestEditItem?: (item: ContentItem) => void,
): boolean {
  return Boolean(
    onRequestEditItem &&
      item.platform === "instagram" &&
      item.id.startsWith("cnt-"),
  )
}

function summarizeOneLine(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (!t) return ""
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

export function ContentCalendar({
  items,
  onRequestEditItem,
  isListRefreshing,
}: {
  items: ContentItem[]
  onRequestEditItem?: (item: ContentItem) => void
  /** 儲存後 refetch／router.refresh 期間的輕量狀態 */
  isListRefreshing?: boolean
}) {
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
  const [focusedOccurrenceId, setFocusedOccurrenceId] = React.useState<
    string | null
  >(null)

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

  const monthHeadingId = "content-calendar-month-heading"

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

  const todayKey = dateToKey(new Date())

  function goToday() {
    const n = new Date()
    const k = dateToKey(n)
    setView({ year: n.getFullYear(), month: n.getMonth() })
    setFocusedOccurrenceId(null)
    setSelectedKey(k)
    setSheetOpen(true)
  }

  function openDay(key: string) {
    setFocusedOccurrenceId(null)
    setSelectedKey(key)
    setSheetOpen(true)
  }

  function activateOccurrence(o: CalendarOccurrence) {
    setFocusedOccurrenceId(o.id)
    if (canUsePipelineEditor(o.item, onRequestEditItem)) {
      onRequestEditItem!(o.item)
    }
  }

  const selectedOccurrences = React.useMemo(() => {
    const raw =
      selectedKey != null ? (byDay.get(selectedKey) ?? []) : []
    return [...raw].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    )
  }, [selectedKey, byDay])

  const filterChips = React.useMemo(() => {
    const items: { label: string; active: boolean }[] = [
      { label: `範圍 · ${getScopeShortLabel(scope, scopedItems)}`, active: true },
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
  }, [scopedItems, scope, platform, eventKind])

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
      {isListRefreshing ? <ListSyncStatus /> : null}
      <div
        className={cn(
          "flex flex-col gap-3 transition-opacity duration-150",
          isListRefreshing && "pointer-events-none opacity-[0.72]",
        )}
        aria-busy={Boolean(isListRefreshing)}
      >
        <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="cal-platform" className="text-muted-foreground text-xs">
            平台
          </label>
          <select
            id="cal-platform"
            className={dashboardSelectClassName}
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
            className={dashboardSelectClassName}
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
      <div className="border-border/60 bg-card/20 flex flex-col gap-2 rounded-lg border p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2
              id={monthHeadingId}
              className="text-foreground truncate text-sm font-semibold"
            >
              {monthLabel}
            </h2>
            {occurrences.length > 0 && occurrencesInViewMonth.length === 0 ? (
              <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                本月沒有事件；其他月份有 {occurrences.length}{" "}
                筆，請切換月份或調整篩選。
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={goToday}
            >
              今日
            </Button>
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

        <div
          role="grid"
          aria-labelledby={monthHeadingId}
          className="grid grid-cols-7 gap-px rounded-md border border-border/50 bg-border/40"
        >
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="bg-muted/50 text-muted-foreground py-2 text-center text-[11px] font-medium"
            >
              {w}
            </div>
          ))}
          {cells.map(({ date, inMonth }) => {
            const key = dateToKey(date)
            const dayOcc = byDay.get(key) ?? []
            const shown = dayOcc.slice(0, MAX_CHIPS_IN_CELL)
            const more = dayOcc.length - shown.length
            const isToday = key === todayKey && inMonth
            const isDaySelected = sheetOpen && selectedKey === key

            return (
              <div
                key={key}
                role="gridcell"
                aria-selected={isDaySelected}
                className={cn(
                  "bg-background flex min-h-[5.25rem] flex-col outline-none sm:min-h-[6rem]",
                  !inMonth && "bg-muted/25 text-muted-foreground/75",
                  inMonth &&
                    dayOcc.length > 0 &&
                    "border-l-2 border-l-primary/35",
                  isDaySelected &&
                    "bg-primary/[0.07] ring-1 ring-primary/45 ring-inset",
                  isToday &&
                    !isDaySelected &&
                    "ring-primary/30 ring-1 ring-inset",
                )}
              >
                <button
                  type="button"
                  onClick={() => openDay(key)}
                  className={cn(
                    "flex w-full items-center gap-1 px-1 py-1 text-left sm:px-1.5",
                    "hover:bg-muted/45 rounded-t-[3px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  )}
                  aria-label={`${formatSheetDateTitle(key)}，查看當日排程`}
                  aria-current={isToday ? "date" : undefined}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums sm:size-7 sm:text-xs",
                      isToday
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {dayOcc.length > 0 ? (
                    <span className="text-muted-foreground ml-auto text-[10px] font-medium tabular-nums">
                      {dayOcc.length} 筆
                    </span>
                  ) : null}
                </button>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-1 pb-1">
                  {shown.map((o) => (
                    <MonthCellItemButton
                      key={o.id}
                      occurrence={o}
                      selected={focusedOccurrenceId === o.id}
                      onActivate={() => activateOccurrence(o)}
                    />
                  ))}
                  {more > 0 ? (
                    <button
                      type="button"
                      onClick={() => openDay(key)}
                      className={cn(
                        "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded px-0.5 py-0.5 text-left text-[10px] font-medium tabular-nums",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      )}
                    >
                      +{more} 更多…
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-sky-500/50 bg-sky-500/25"
              aria-hidden
            />
            排程事件
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-sm border border-emerald-500/50 bg-emerald-500/25"
              aria-hidden
            />
            已發佈事件
          </span>
          <span className="text-muted-foreground/80 hidden sm:inline">
            點日期列開當日清單；點內容列開可編輯項目（若適用）。
          </span>
        </div>
      </div>
      ) : null}

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) {
            setSelectedKey(null)
            setFocusedOccurrenceId(null)
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          showCloseButton
        >
          <SheetHeader className="border-border/50 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 space-y-1 border-b px-4 py-3 text-left backdrop-blur-md">
            <SheetTitle className="text-base leading-snug">
              {selectedKey ? formatSheetDateTitle(selectedKey) : "內容"}
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed">
              {selectedOccurrences.length > 0
                ? `共 ${selectedOccurrences.length} 筆（依時間排序）；套用與主畫面相同的範圍與篩選。`
                : "點選月格上的日期以查看當日排程。"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
            {selectedOccurrences.length === 0 ? (
              <div className="flex flex-col gap-3">
                <EmptyState
                  className="border-border/50 bg-muted/10 px-3 py-6 text-left"
                  title="這一天沒有事件"
                  reason="在目前範圍與篩選下，此日沒有排程或已發佈紀錄。"
                  suggestion="試選其他日期、切換月份，或放寬「平台／事件類型」篩選。"
                />
                <Link
                  href="/instagram"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "w-full justify-center",
                  )}
                >
                  前往 Instagram 內容工作台
                </Link>
              </div>
            ) : (
              <ol className="border-border/50 divide-border/50 divide-y rounded-lg border bg-muted/5">
                {selectedOccurrences.map((o) => (
                  <li key={o.id} className="p-0">
                    <DayAgendaRow
                      occurrence={o}
                      focused={focusedOccurrenceId === o.id}
                      onActivate={() => activateOccurrence(o)}
                      showEditHint={canUsePipelineEditor(
                        o.item,
                        onRequestEditItem,
                      )}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  )
}

function MonthCellItemButton({
  occurrence,
  selected,
  onActivate,
}: {
  occurrence: CalendarOccurrence
  selected: boolean
  onActivate: () => void
}) {
  const { item, kind } = occurrence
  const isScheduled = kind === "scheduled"
  const cap = summarizeOneLine(item.caption, 36)
  const titleShort = summarizeOneLine(item.title, 22)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        onActivate()
      }}
      className={cn(
        "flex w-full min-w-0 flex-col gap-0.5 rounded border px-1 py-0.5 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isScheduled
          ? "border-sky-500/35 bg-sky-500/10"
          : "border-emerald-500/35 bg-emerald-500/10",
        selected &&
          "ring-primary ring-offset-background ring-2 ring-offset-1",
      )}
      title={`${item.title} — ${contentStatusLabel[item.status]} · ${contentPlatformLabel[item.platform]}`}
      aria-label={`${item.title}，${contentStatusLabel[item.status]}`}
    >
      <div className="flex min-w-0 items-center gap-0.5">
        <span
          className={cn(
            "shrink-0 rounded px-0.5 font-mono text-[9px] font-semibold leading-none sm:text-[10px]",
            "text-muted-foreground border border-border/60 bg-background/40",
          )}
        >
          {PLATFORM_ABBR[item.platform]}
        </span>
        <span
          className={cn(
            "max-w-[4.5rem] shrink-0 truncate rounded px-0.5 text-[9px] font-medium leading-tight sm:max-w-[5.5rem] sm:text-[10px]",
            isScheduled
              ? "bg-sky-500/20 text-sky-100"
              : "bg-emerald-500/20 text-emerald-100",
          )}
        >
          {contentStatusLabel[item.status]}
        </span>
        <span className="text-foreground min-w-0 truncate text-[9px] font-medium leading-tight sm:text-[10px]">
          {titleShort}
        </span>
      </div>
      {cap ? (
        <p className="text-muted-foreground hidden truncate text-[9px] leading-tight sm:block">
          {cap}
        </p>
      ) : null}
    </button>
  )
}

function DayAgendaRow({
  occurrence,
  focused,
  onActivate,
  showEditHint,
}: {
  occurrence: CalendarOccurrence
  focused: boolean
  onActivate: () => void
  showEditHint: boolean
}) {
  const { item, kind, at } = occurrence
  const cap = summarizeOneLine(item.caption, 120)

  return (
    <div
      className={cn(
        "flex gap-2 px-3 py-2.5 transition-colors sm:px-3.5 sm:py-3",
        focused && "bg-primary/8",
      )}
    >
      <div className="text-muted-foreground w-[4.25rem] shrink-0 pt-0.5 text-[11px] tabular-nums sm:w-[4.5rem]">
        {formatDateTime(at)}
      </div>
      <button
        type="button"
        onClick={onActivate}
        className={cn(
          "min-w-0 flex-1 rounded-md text-left",
          "hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        )}
        aria-label={
          showEditHint
            ? `${item.title}，開啟編輯對話框`
            : `${item.title}，檢視內容詳情`
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-[10px] font-semibold"
          >
            {PLATFORM_ABBR[item.platform]}
          </Badge>
          <span className="text-muted-foreground text-[10px]">
            {contentPlatformLabel[item.platform]}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-[10px]",
              kind === "scheduled"
                ? "border-sky-500/45 bg-sky-500/10 text-sky-100"
                : "border-emerald-500/45 bg-emerald-500/10 text-emerald-100",
            )}
          >
            {KIND_LABEL[kind]}
          </Badge>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {contentStatusLabel[item.status]}
          </Badge>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {contentPostTypeLabel[item.postType]}
          </Badge>
        </div>
        <p className="text-foreground mt-1 text-sm font-medium leading-snug">
          {item.title}
        </p>
        {item.clientName ? (
          <p className="text-muted-foreground mt-0.5 text-xs">
            {item.clientName}
          </p>
        ) : null}
        {cap ? (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {cap}
          </p>
        ) : null}
        {showEditHint ? (
          <p className="text-primary/90 mt-1.5 text-[11px] font-medium">
            點此列可開啟編輯對話框。
          </p>
        ) : (
          <p className="text-muted-foreground mt-1.5 text-[11px]">
            此項目目前沒有快捷編輯器；請於各平台頁面管理。
          </p>
        )}
      </button>
    </div>
  )
}
