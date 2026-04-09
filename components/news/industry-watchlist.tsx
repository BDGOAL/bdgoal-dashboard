"use client"

import * as React from "react"
import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { FilterActiveChips } from "@/components/dashboard/filter-active-chips"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import {
  followUpLabel,
  newsSignalLabel,
  newsTopicLabel,
  relevanceLabel,
} from "@/lib/news/labels"
import { mockBrands, mockClients } from "@/lib/mock/agency"
import { mockNewsItems } from "@/lib/mock/news"
import {
  NEWS_TIME_WINDOW_LABEL,
  type NewsTimeWindow,
  newsItemMatchesTimeWindow,
} from "@/lib/news/time-window"
import { filterNewsByScope } from "@/lib/scope/filter-news"
import { getScopeShortLabel } from "@/lib/scope/scope-label"
import {
  FOLLOW_UP_PRIORITIES,
  NEWS_SIGNAL_TYPES,
  NEWS_TOPICS,
  type FollowUpPriority,
  type NewsItem,
  type NewsSignalType,
  type NewsTopic,
} from "@/lib/types/news"
import { cn } from "@/lib/utils"

const selectClass = cn(
  "border-input bg-background dark:bg-input/30 h-8 max-w-[140px] rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function relatedLabel(item: NewsItem): string {
  if (item.clientIds.length === 0 && item.brandIds.length === 0) {
    return "全客戶／內部"
  }
  const parts: string[] = []
  for (const cid of item.clientIds) {
    const c = mockClients.find((x) => x.id === cid)
    if (c) parts.push(c.name)
  }
  for (const bid of item.brandIds) {
    const b = mockBrands.find((x) => x.id === bid)
    if (b) parts.push(b.name)
  }
  return parts.length ? parts.join(" · ") : "—"
}

const TIME_WINDOWS: NewsTimeWindow[] = ["today", "7d", "week", "all"]

export function IndustryWatchlist() {
  const { scope } = useWorkspaceScope()
  const [topic, setTopic] = React.useState<NewsTopic | "all">("all")
  const [followUp, setFollowUp] = React.useState<FollowUpPriority | "all">(
    "all",
  )
  const [signal, setSignal] = React.useState<NewsSignalType | "all">("all")
  const [timeWindow, setTimeWindow] = React.useState<NewsTimeWindow>("7d")

  const scoped = React.useMemo(
    () => filterNewsByScope(mockNewsItems, scope),
    [scope],
  )

  const afterTopicFilters = React.useMemo(() => {
    let r = scoped
    if (topic !== "all") r = r.filter((i) => i.topic === topic)
    if (followUp !== "all") r = r.filter((i) => i.followUpPriority === followUp)
    if (signal !== "all") r = r.filter((i) => i.signalType === signal)
    return r
  }, [scoped, topic, followUp, signal])

  const filtered = React.useMemo(() => {
    const r = afterTopicFilters.filter((i) =>
      newsItemMatchesTimeWindow(i.publishDate, timeWindow),
    )
    return [...r].sort(
      (a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime(),
    )
  }, [afterTopicFilters, timeWindow])

  const highCount = React.useMemo(
    () => filtered.filter((i) => i.followUpPriority === "high").length,
    [filtered],
  )

  const filterChips = React.useMemo(() => {
    const items: { label: string; active: boolean }[] = [
      { label: `範圍 · ${getScopeShortLabel(scope)}`, active: true },
      { label: `時間 · ${NEWS_TIME_WINDOW_LABEL[timeWindow]}`, active: true },
    ]
    if (topic !== "all") {
      items.push({ label: `主題 · ${newsTopicLabel[topic]}`, active: true })
    }
    if (followUp !== "all") {
      items.push({ label: `後續 · ${followUpLabel[followUp]}`, active: true })
    }
    if (signal !== "all") {
      items.push({ label: `信號 · ${newsSignalLabel[signal]}`, active: true })
    }
    return items
  }, [scope, timeWindow, topic, followUp, signal])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          id="nw-topic"
          label="主題"
          value={topic}
          onChange={(v) => setTopic(v as NewsTopic | "all")}
        >
          <option value="all">全部</option>
          {NEWS_TOPICS.map((t) => (
            <option key={t} value={t}>
              {newsTopicLabel[t]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="nw-follow"
          label="後續優先"
          value={followUp}
          onChange={(v) => setFollowUp(v as FollowUpPriority | "all")}
        >
          <option value="all">全部</option>
          {FOLLOW_UP_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {followUpLabel[p]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="nw-signal"
          label="信號類型"
          value={signal}
          onChange={(v) => setSignal(v as NewsSignalType | "all")}
        >
          <option value="all">全部</option>
          {NEWS_SIGNAL_TYPES.map((s) => (
            <option key={s} value={s}>
              {newsSignalLabel[s]}
            </option>
          ))}
        </FilterSelect>
        <div className="flex min-w-[min(100%,220px)] flex-col gap-1.5">
          <span className="text-muted-foreground text-[11px]">發佈時間</span>
          <div className="flex flex-wrap gap-1">
            {TIME_WINDOWS.map((w) => (
              <Button
                key={w}
                type="button"
                size="sm"
                variant={timeWindow === w ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setTimeWindow(w)}
              >
                {NEWS_TIME_WINDOW_LABEL[w]}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-muted-foreground ml-auto text-[11px]">
          <span className="text-foreground font-medium tabular-nums">
            {filtered.length}
          </span>{" "}
          則 · 高優先{" "}
          <span className="text-foreground font-medium tabular-nums">
            {highCount}
          </span>
        </p>
      </div>

      <FilterActiveChips items={filterChips} />

      {scoped.length === 0 ? (
        <EmptyState
          title="此範圍內沒有產業信號"
          reason="摘要與新聞條目會依客戶／品牌標籤過濾；目前範圍下沒有對應項目。"
          suggestion="將頂端「範圍」改為「全部客戶」或其他客戶／品牌，再檢視列表。"
        />
      ) : afterTopicFilters.length === 0 ? (
        <EmptyState
          title="主題／後續／信號的組合沒有結果"
          reason="在目前已套用的主題、後續優先或信號類型下，沒有任何一則通過篩選。"
          suggestion="將任一篩選改回「全部」，或放寬條件後再試。"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="在目前的發佈時間條件下沒有項目"
          reason={`已套用「${NEWS_TIME_WINDOW_LABEL[timeWindow]}」；符合主題／信號的條目不在此期間內。`}
          suggestion="改選「全部期間」或「本週」，或略為放寬主題／信號篩選。"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <NewsCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-muted-foreground text-[11px]">
        {label}
      </label>
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const isHigh = item.followUpPriority === "high"

  return (
    <Card
      size="sm"
      className={cn(
        "ring-foreground/8 shadow-none",
        isHigh &&
          "border-l-amber-500/80 bg-amber-500/[0.06] border-l-[3px]",
      )}
    >
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-foreground min-w-0 flex-1 text-[13px] leading-snug font-semibold">
            {item.title}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
              isHigh
                ? "border-amber-500/50 text-amber-100"
                : "border-border/60 text-muted-foreground",
            )}
          >
            後續 {followUpLabel[item.followUpPriority]}
          </span>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          <span>{item.source}</span>
          <span className="tabular-nums">{formatDate(item.publishDate)}</span>
          <span className="text-foreground/90">
            {relatedLabel(item)}
          </span>
        </div>
        <p className="text-muted-foreground text-[12px] leading-relaxed">
          {item.summary}
        </p>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <Tag>主題 · {newsTopicLabel[item.topic]}</Tag>
          <Tag>信號 · {newsSignalLabel[item.signalType]}</Tag>
          <Tag>相關度 · {relevanceLabel[item.relevanceLevel]}</Tag>
        </div>
        <div className="border-border/40 bg-muted/20 rounded-md border px-2.5 py-2">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            為何重要
          </p>
          <p className="text-foreground/95 mt-1 text-[11px] leading-snug">
            {item.whyItMatters}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-[11px] font-medium underline-offset-4 hover:underline"
          >
            來源連結
            <ExternalLinkIcon className="size-3" aria-hidden />
          </a>
        </div>
      </div>
    </Card>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-border/50 bg-background/80 text-muted-foreground rounded border px-1.5 py-0.5">
      {children}
    </span>
  )
}
