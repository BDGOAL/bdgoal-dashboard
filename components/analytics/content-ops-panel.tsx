"use client"

import * as React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { buildContentOpsSnapshot } from "@/lib/analytics/content-ops-snapshot"
import { contentPlatformLabel } from "@/lib/calendar/labels"
import { contentStatusLabel } from "@/lib/instagram/labels"
import { filterContentByScope } from "@/lib/scope/filter-content"
import { getScopeShortLabel } from "@/lib/scope/scope-label"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import type { ContentItem } from "@/lib/types/dashboard"
import { cn } from "@/lib/utils"

const u = {
  emptyTitle: "\u6b64\u7bc4\u570d\u5167\u6c92\u6709\u53ef\u5206\u6790\u7684\u5167\u5bb9",
  emptyReason:
    "Analytics \u7684\u7ba1\u7dda\u7d71\u8a08\u4f9d\u76ee\u524d\u5de5\u4f5c\u5340\u7bc4\u570d\u5167\u5df2\u6709\u7684\u5167\u5bb9\u9805\u76ee\u3002",
  emptySuggestion:
    "\u8acb\u5728\u9802\u7aef\u5207\u63db\u300c\u5168\u90e8\u5ba2\u6236\u300d\u6216\u5176\u4ed6\u5ba2\u6236\uff0f\u54c1\u724c\uff0c\u6216\u5148\u532f\u5165\uff0f\u5efa\u7acb\u5167\u5bb9\u3002",
  sectionTitle: "\u5167\u5bb9\u7ba1\u7dda\u6982\u89bd",
  sectionLeadA: "\u4ee5\u4e0b\u6578\u5b57\u7531 Dashboard \u5167\u5bb9\u8cc7\u6599\u5373\u6642\u8a08\u7b97\uff08\u7bc4\u570d\uff1a",
  sectionLeadB:
    "\uff09\uff1b\u4e0d\u542b\u5916\u90e8\u793e\u7fa4\u6210\u6548\u3002",
  kpiTotal: "\u7e3d\u5167\u5bb9\u6578",
  kpiTotalHint: "\u7bc4\u570d\u5167\u9805\u76ee",
  kpiPlanning: "\u898f\u5283\u4e2d",
  kpiPlanningHint: "\u9748\u611f + \u8349\u7a3f",
  kpiScheduled: "\u5df2\u6392\u7a0b",
  kpiScheduledHint: "\u542b\u6392\u7a0b\u6642\u9593",
  kpiPublished: "\u5df2\u767c\u4f48",
  kpiPublishedHint: "\u6a19\u8a18\u70ba\u5df2\u4e0a\u7dda",
  kpiTouched: "\u8fd1 7 \u65e5\u7570\u52d5",
  kpiTouchedHint: "\u5efa\u7acb\u6216\u66f4\u65b0\u843d\u5728 7 \u65e5\u5167",
  platTitle: "\u5e73\u53f0\u5206\u4f48",
  platSub: "\u5167\u5bb9\u9805\u76ee\u5e73\u53f0\u4f4d\u52a0\u7e3d",
  statusTitle: "\u72c0\u614b\u5206\u4f48",
  statusSub: "Editorial \u7ba1\u7dda\u968e\u6bb5",
  clientTitle: "\u4f9d\u5ba2\u6236",
  clientSub: "\u4f9d client \u532f\u7e3d\uff08\u986f\u793a\u524d 8 \u540d\uff09",
  recentTitle: "\u6700\u8fd1\u66f4\u65b0",
  recentSub: "\u4f9d updatedAt \u6392\u5e8f\uff0c\u6700\u591a 12 \u7b46",
  noData: "\u7121\u8cc7\u6599",
} as const

function formatInt(n: number) {
  return new Intl.NumberFormat("zh-TW").format(Math.round(n))
}

function BreakdownBar({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate">{label}</span>
        <span className="text-foreground shrink-0 tabular-nums font-medium">
          {formatInt(value)}
        </span>
      </div>
      <div className="bg-muted/50 h-1.5 overflow-hidden rounded-full">
        <div
          className="from-primary/80 to-primary/50 h-full rounded-full bg-gradient-to-r"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ContentOpsPanel({ items }: { items: ContentItem[] }) {
  const { scope } = useWorkspaceScope()
  const scoped = React.useMemo(
    () => filterContentByScope(items, scope),
    [items, scope],
  )
  const snap = React.useMemo(
    () => buildContentOpsSnapshot(scoped),
    [scoped],
  )

  const maxPlatform = React.useMemo(
    () => Math.max(0, ...snap.byPlatform.map((x) => x.count)),
    [snap.byPlatform],
  )
  const maxStatus = React.useMemo(
    () => Math.max(0, ...snap.byStatus.map((x) => x.count)),
    [snap.byStatus],
  )
  const maxClient = React.useMemo(
    () => Math.max(0, ...snap.byClient.map((x) => x.count)),
    [snap.byClient],
  )

  if (scoped.length === 0) {
    return (
      <EmptyState
        title={u.emptyTitle}
        reason={u.emptyReason}
        suggestion={u.emptySuggestion}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-foreground text-sm font-semibold">{u.sectionTitle}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {u.sectionLeadA}
          {getScopeShortLabel(scope, items)}
          {u.sectionLeadB}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        <OpsKpi
          label={u.kpiTotal}
          value={formatInt(snap.total)}
          hint={u.kpiTotalHint}
        />
        <OpsKpi
          label={u.kpiPlanning}
          value={formatInt(snap.planning)}
          hint={u.kpiPlanningHint}
        />
        <OpsKpi
          label={u.kpiScheduled}
          value={formatInt(snap.scheduled)}
          hint={u.kpiScheduledHint}
        />
        <OpsKpi
          label={u.kpiPublished}
          value={formatInt(snap.published)}
          hint={u.kpiPublishedHint}
        />
        <OpsKpi
          className="col-span-2 md:col-span-1 lg:col-span-1"
          label={u.kpiTouched}
          value={formatInt(snap.touchedLast7d)}
          hint={u.kpiTouchedHint}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card size="sm" className="ring-foreground/8 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{u.platTitle}</CardTitle>
            <p className="text-muted-foreground text-xs font-normal">{u.platSub}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {snap.byPlatform.length === 0 ? (
              <p className="text-muted-foreground text-xs">{u.noData}</p>
            ) : (
              snap.byPlatform.map((row) => (
                <BreakdownBar
                  key={row.platform}
                  label={contentPlatformLabel[row.platform]}
                  value={row.count}
                  max={maxPlatform}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="ring-foreground/8 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{u.statusTitle}</CardTitle>
            <p className="text-muted-foreground text-xs font-normal">{u.statusSub}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {snap.byStatus.length === 0 ? (
              <p className="text-muted-foreground text-xs">{u.noData}</p>
            ) : (
              snap.byStatus.map((row) => (
                <BreakdownBar
                  key={row.status}
                  label={contentStatusLabel[row.status]}
                  value={row.count}
                  max={maxStatus}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card size="sm" className="ring-foreground/8 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{u.clientTitle}</CardTitle>
            <p className="text-muted-foreground text-xs font-normal">{u.clientSub}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {snap.byClient.length === 0 ? (
              <p className="text-muted-foreground text-xs">{u.noData}</p>
            ) : (
              snap.byClient.slice(0, 8).map((row) => (
                <BreakdownBar
                  key={row.key}
                  label={row.label}
                  value={row.count}
                  max={maxClient}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="ring-foreground/8 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{u.recentTitle}</CardTitle>
            <p className="text-muted-foreground text-xs font-normal">{u.recentSub}</p>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <ul className="divide-border/50 max-h-[280px] divide-y overflow-y-auto rounded-md border">
              {snap.recentActivity.map((row) => (
                <li
                  key={row.id}
                  className="hover:bg-muted/20 flex flex-col gap-0.5 px-3 py-2.5 text-xs transition-colors"
                >
                  <span className="text-foreground font-medium leading-snug">
                    {row.title}
                  </span>
                  <span className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{contentPlatformLabel[row.platform]}</span>
                    <span>{contentStatusLabel[row.status]}</span>
                    <span className="tabular-nums">{row.updatedAt.slice(0, 10)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OpsKpi({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: string
  hint: string
  className?: string
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "ring-foreground/8 shadow-none transition-colors hover:bg-muted/10",
        className,
      )}
    >
      <CardHeader className="gap-1 pb-3 pt-3">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-foreground text-lg font-semibold tabular-nums sm:text-xl">
          {value}
        </p>
        <p className="text-muted-foreground/80 text-[11px] font-normal">{hint}</p>
      </CardHeader>
    </Card>
  )
}
