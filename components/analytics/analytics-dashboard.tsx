"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContentOpsPanel } from "@/components/analytics/content-ops-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { FilterActiveChips } from "@/components/dashboard/filter-active-chips"
import type {
  AnalyticsDateRange,
  AnalyticsSnapshot,
  PerformanceByPeriodRow,
  TopPerformingPost,
} from "@/lib/types/analytics"
import type { ContentItem } from "@/lib/types/dashboard"
import { ANALYTICS_RANGE_OPTIONS } from "@/lib/analytics/range-options"
import { getScopeShortLabel } from "@/lib/scope/scope-label"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { contentPlatformLabel } from "@/lib/calendar/labels"

const axisStroke = "hsl(var(--muted-foreground))"
const gridStroke = "hsl(var(--border))"
const barFill = "hsl(217 91% 60% / 0.55)"
const lineStroke = "hsl(142 76% 45%)"

function formatInt(n: number) {
  return new Intl.NumberFormat("zh-TW").format(Math.round(n))
}

function formatPct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}

function formatShortDate(iso: string) {
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

export function AnalyticsDashboard({ items }: { items: ContentItem[] }) {
  const { scope } = useWorkspaceScope()
  const [range, setRange] = React.useState<AnalyticsDateRange>("30d")
  const [snapshot, setSnapshot] = React.useState<AnalyticsSnapshot | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void import("@/lib/mock/analytics").then((m) => {
      if (cancelled) return
      setSnapshot(m.getAnalyticsSnapshot(range, scope))
    })
    return () => {
      cancelled = true
    }
  }, [range, scope])

  const kpis = snapshot?.kpis

  const barData = React.useMemo(() => {
    const performanceByPeriod = snapshot?.performanceByPeriod ?? []
    return performanceByPeriod.map((r) => ({
      ...r,
      impressionsK: Math.round(r.impressions / 1000),
    }))
  }, [snapshot])

  const lineData = React.useMemo(() => {
    const followerTrend = snapshot?.followerTrend ?? []
    return followerTrend.map((p) => ({
      ...p,
      label: p.date.slice(5),
    }))
  }, [snapshot])

  const topPosts = snapshot?.topPosts ?? []

  const rangeLabel =
    ANALYTICS_RANGE_OPTIONS.find((o) => o.value === range)?.label ?? range

  if (!kpis) {
    return (
      <div className="flex flex-col gap-6">
        <ContentOpsPanel items={items} />
        <p className="text-muted-foreground text-xs">載入分析示範資料…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ContentOpsPanel items={items} />

      <div className="border-border/55 bg-muted/10 relative rounded-xl border border-dashed p-4 pt-6">
        <span className="bg-background text-muted-foreground absolute -top-2.5 left-3 rounded border border-border/60 px-2 py-0.5 text-[10px] font-medium">
          演示：社群成效（mock）
        </span>
        <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard
          label="總曝光"
          value={formatInt(kpis.totalImpressions)}
          hint={`${rangeLabel}內加總（示範）`}
        />
        <KpiCard
          label="互動率"
          value={formatPct(kpis.engagementRate)}
          hint="互動次數 ÷ 曝光"
        />
        <KpiCard
          label="追蹤淨成長"
          value={`+${formatInt(kpis.followerGrowth)}`}
          hint={`${rangeLabel}區間`}
        />
        <KpiCard
          label="單篇最高曝光"
          value={formatInt(kpis.peakPostImpressions)}
          hint="區間內最佳貼文"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-foreground text-xs font-medium">分析期間</p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              圖表與 KPI 依下方鈕與頂端「範圍」重算；數字為示範資料。
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ANALYTICS_RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={range === opt.value ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <FilterActiveChips
          items={[
            {
              label: `範圍 · ${getScopeShortLabel(scope, items)}`,
              active: true,
            },
            { label: `期間 · ${rangeLabel}`, active: true },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card size="sm" className="shadow-none ring-foreground/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              內容曝光走勢
            </CardTitle>
            <p className="text-muted-foreground text-xs font-normal">
              依子區間加總；游標可讀取互動數
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px] w-full min-h-[220px] min-w-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: axisStroke, fontSize: 11 }}
                    axisLine={{ stroke: gridStroke }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisStroke, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]?.payload as
                        | PerformanceByPeriodRow
                        | undefined
                      if (!row) return null
                      return (
                        <div className="border-border bg-popover text-popover-foreground rounded-md border px-2.5 py-2 text-xs shadow-md">
                          <p className="text-muted-foreground mb-1 font-medium">
                            {label}
                          </p>
                          <p>
                            曝光 {formatInt(row.impressions)} · 互動{" "}
                            {formatInt(row.engagements)}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="impressionsK"
                    name="曝光（千）"
                    fill={barFill}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card size="sm" className="shadow-none ring-foreground/8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              追蹤人數
            </CardTitle>
            <p className="text-muted-foreground text-xs font-normal">
              所選範圍內帳號之追蹤總數（示範）
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px] w-full min-h-[220px] min-w-0">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={lineData}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: axisStroke, fontSize: 10 }}
                    axisLine={{ stroke: gridStroke }}
                    tickLine={false}
                    interval={
                      range === "30d" ? 4 : range === "90d" ? 1 : 0
                    }
                  />
                  <YAxis
                    tick={{ fill: axisStroke, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["dataMin - 200", "dataMax + 200"]}
                    tickFormatter={(v) => formatInt(v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const v = payload[0]?.value
                      return (
                        <div className="border-border bg-popover text-popover-foreground rounded-md border px-2.5 py-2 text-xs shadow-md">
                          <p className="text-muted-foreground mb-1">{label}</p>
                          <p className="tabular-nums font-medium">
                            {typeof v === "number" ? formatInt(v) : v}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="followers"
                    name="追蹤數"
                    stroke={lineStroke}
                    strokeWidth={2}
                    dot={{ r: 2, fill: lineStroke }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <TopPostsTable posts={topPosts} scopeLabel={getScopeShortLabel(scope, items)} />
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card size="sm" className="ring-foreground/8 shadow-none">
      <CardHeader className="gap-1 pb-3 pt-3">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-foreground text-xl font-semibold tabular-nums sm:text-2xl">
          {value}
        </p>
        <p className="text-muted-foreground/80 text-[11px] font-normal">
          {hint}
        </p>
      </CardHeader>
    </Card>
  )
}

function TopPostsTable({
  posts,
  scopeLabel,
}: {
  posts: TopPerformingPost[]
  scopeLabel: string
}) {
  return (
    <Card size="sm" className="shadow-none ring-foreground/8">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="text-sm font-semibold">高表現貼文</CardTitle>
        <p className="text-muted-foreground text-xs font-normal">
          依曝光排序 · 範圍：{scopeLabel}
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-3">
        {posts.length === 0 ? (
          <EmptyState
            className="border-none bg-transparent"
            title="此範圍與期間沒有上榜貼文"
            reason="示範資料在目前的客戶／品牌／帳號範圍內可能沒有已發佈項目，或曝光未進入榜單。"
            suggestion="請切換頂端「範圍」或拉長「分析期間」，再檢視是否出現貼文。"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-border/50 border-b text-xs">
                  <th className="px-4 py-2 font-medium">標題</th>
                  <th className="px-2 py-2 font-medium">平台</th>
                  <th className="px-2 py-2 font-medium tabular-nums">曝光</th>
                  <th className="px-2 py-2 font-medium">互動率</th>
                  <th className="px-4 py-2 font-medium">發佈日</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-border/40 hover:bg-muted/30 border-b text-xs last:border-0"
                  >
                    <td className="text-foreground max-w-[220px] truncate px-4 py-2 font-medium">
                      {p.title}
                    </td>
                    <td className="text-muted-foreground px-2 py-2">
                      {contentPlatformLabel[p.platform]}
                    </td>
                    <td className="text-foreground px-2 py-2 tabular-nums">
                      {formatInt(p.impressions)}
                    </td>
                    <td className="text-muted-foreground px-2 py-2 tabular-nums">
                      {formatPct(p.engagementRate)}
                    </td>
                    <td className="text-muted-foreground px-4 py-2 tabular-nums">
                      {formatShortDate(p.publishedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
