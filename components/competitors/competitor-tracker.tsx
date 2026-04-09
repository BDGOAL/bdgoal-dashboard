"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MinusIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { contentPlatformLabel } from "@/lib/calendar/labels"
import { mockCompetitors } from "@/lib/mock/competitors"
import { filterCompetitorsByScope } from "@/lib/scope/filter-competitors"
import type { CompetitorTrend } from "@/lib/types/competitor"
import { cn } from "@/lib/utils"

type SortKey =
  | "name"
  | "platform"
  | "handle"
  | "recentPosts"
  | "engagement"
  | "postingFrequency"
  | "followerGrowth"
  | "trendDirection"

function formatPct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

function trendLabel(t: CompetitorTrend) {
  if (t === "up") return "上升"
  if (t === "down") return "下降"
  return "持平"
}

function TrendIcon({ t }: { t: CompetitorTrend }) {
  if (t === "up")
    return (
      <ArrowUpIcon className="size-3.5 text-emerald-400" aria-hidden />
    )
  if (t === "down")
    return <ArrowDownIcon className="size-3.5 text-rose-400" aria-hidden />
  return <MinusIcon className="text-muted-foreground size-3.5" aria-hidden />
}

export function CompetitorTracker() {
  const { scope } = useWorkspaceScope()
  const filtered = React.useMemo(
    () => filterCompetitorsByScope(mockCompetitors, scope),
    [scope],
  )

  const [sort, setSort] = React.useState<{
    key: SortKey
    dir: "asc" | "desc"
  }>({ key: "engagement", dir: "desc" })

  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const sorted = React.useMemo(() => {
    const arr = [...filtered]
    const mult = sort.dir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      const key = sort.key
      if (key === "name" || key === "handle" || key === "postingFrequency") {
        return mult * String(a[key]).localeCompare(String(b[key]), "zh-Hant")
      }
      if (key === "platform" || key === "trendDirection") {
        return mult * String(a[key]).localeCompare(String(b[key]))
      }
      const va = a[key] as number
      const vb = b[key] as number
      return mult * (va - vb)
    })
    return arr
  }, [filtered, sort])

  const summary = React.useMemo(() => {
    const n = filtered.length
    if (n === 0) {
      return { n: 0, avgEng: 0, up: 0 }
    }
    const avgEng =
      filtered.reduce((s, c) => s + c.engagement, 0) / n
    const up = filtered.filter((c) => c.trendDirection === "up").length
    return { n, avgEng, up }
  }, [filtered])

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Card
          size="sm"
          className="ring-foreground/8 flex flex-row items-center justify-between py-2.5 shadow-none"
        >
          <span className="text-muted-foreground text-xs">追蹤筆數</span>
          <span className="text-lg font-semibold tabular-nums">{summary.n}</span>
        </Card>
        <Card
          size="sm"
          className="ring-foreground/8 flex flex-row items-center justify-between py-2.5 shadow-none"
        >
          <span className="text-muted-foreground text-xs">平均互動率</span>
          <span className="text-lg font-semibold tabular-nums">
            {summary.n ? formatPct(summary.avgEng) : "—"}
          </span>
        </Card>
        <Card
          size="sm"
          className="ring-foreground/8 col-span-2 flex flex-row items-center justify-between py-2.5 shadow-none md:col-span-1"
        >
          <span className="text-muted-foreground text-xs">上升趨勢</span>
          <span className="text-lg font-semibold tabular-nums">{summary.up}</span>
        </Card>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="此工作區範圍內沒有競品列管"
          reason="示範資料依客戶／品牌綁定；目前範圍下沒有對應的公開帳號指標。"
          suggestion="請在頂端將「範圍」改為「全部客戶」、其他客戶或品牌，以載入可對照的競品列表。"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="bg-muted/30 border-b text-[11px]">
                <th className="w-8 px-2 py-2" />
                <SortTh
                  label="競品"
                  active={sort.key === "name"}
                  dir={sort.dir}
                  onClick={() => toggleSort("name")}
                />
                <SortTh
                  label="平台"
                  active={sort.key === "platform"}
                  dir={sort.dir}
                  onClick={() => toggleSort("platform")}
                />
                <SortTh
                  label="帳號"
                  active={sort.key === "handle"}
                  dir={sort.dir}
                  onClick={() => toggleSort("handle")}
                />
                <SortTh
                  label="近期貼文"
                  active={sort.key === "recentPosts"}
                  dir={sort.dir}
                  onClick={() => toggleSort("recentPosts")}
                  className="tabular-nums"
                />
                <SortTh
                  label="互動率"
                  active={sort.key === "engagement"}
                  dir={sort.dir}
                  onClick={() => toggleSort("engagement")}
                  className="tabular-nums"
                />
                <SortTh
                  label="發文頻率"
                  active={sort.key === "postingFrequency"}
                  dir={sort.dir}
                  onClick={() => toggleSort("postingFrequency")}
                />
                <SortTh
                  label="追蹤成長"
                  active={sort.key === "followerGrowth"}
                  dir={sort.dir}
                  onClick={() => toggleSort("followerGrowth")}
                  className="tabular-nums"
                />
                <SortTh
                  label="趨勢"
                  active={sort.key === "trendDirection"}
                  dir={sort.dir}
                  onClick={() => toggleSort("trendDirection")}
                />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className="border-border/50 hover:bg-muted/20 border-b transition-colors"
                  >
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground rounded p-0.5"
                        aria-expanded={expandedId === row.id}
                        aria-label={expandedId === row.id ? "收合" : "展開"}
                        onClick={() =>
                          setExpandedId((id) =>
                            id === row.id ? null : row.id,
                          )
                        }
                      >
                        {expandedId === row.id ? (
                          <ChevronDownIcon className="size-4" />
                        ) : (
                          <ChevronRightIcon className="size-4" />
                        )}
                      </button>
                    </td>
                    <td className="text-foreground max-w-[140px] truncate px-2 py-2 font-medium">
                      {row.name}
                    </td>
                    <td className="text-muted-foreground px-2 py-2">
                      {contentPlatformLabel[row.platform]}
                    </td>
                    <td className="text-muted-foreground max-w-[120px] truncate px-2 py-2 font-mono">
                      {row.handle}
                    </td>
                    <td className="text-foreground px-2 py-2 tabular-nums">
                      {row.recentPosts}
                    </td>
                    <td className="text-foreground px-2 py-2 tabular-nums">
                      {formatPct(row.engagement)}
                    </td>
                    <td className="text-muted-foreground px-2 py-2">
                      {row.postingFrequency}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 tabular-nums",
                        row.followerGrowth >= 0
                          ? "text-foreground"
                          : "text-rose-300/90",
                      )}
                    >
                      {row.followerGrowth >= 0 ? "+" : ""}
                      {row.followerGrowth.toLocaleString("zh-TW")}
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1">
                        <TrendIcon t={row.trendDirection} />
                        <span className="text-muted-foreground">
                          {trendLabel(row.trendDirection)}
                        </span>
                      </span>
                    </td>
                  </tr>
                  {expandedId === row.id ? (
                    <tr className="bg-muted/15 border-border/50 border-b">
                      <td />
                      <td
                        colSpan={8}
                        className="text-muted-foreground px-3 py-2.5 leading-relaxed"
                      >
                        <span className="text-foreground/90 text-[11px] font-medium">
                          觀察摘要
                        </span>
                        <p className="mt-1">
                          {row.notes?.trim()
                            ? row.notes
                            : "尚無策略備註；實務上可記錄貼文風格、檔期或合作觀察。"}
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SortTh({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
  className?: string
}) {
  return (
    <th className={cn("px-2 py-2 font-medium", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-0.5",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active ? (
          <span className="text-[10px] opacity-70" aria-hidden>
            {dir === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </button>
    </th>
  )
}
