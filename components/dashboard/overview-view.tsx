"use client"

import * as React from "react"

import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PageIntro } from "@/components/dashboard/page-intro"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { contentStatusLabel } from "@/lib/instagram/labels"
import { mockContentItems } from "@/lib/mock/content"
import { filterContentByScope } from "@/lib/scope/filter-content"
import type { ContentStatus } from "@/lib/types/dashboard"

function countByStatus(items: { status: ContentStatus }[], status: ContentStatus) {
  return items.filter((i) => i.status === status).length
}

export function OverviewView() {
  const { scope } = useWorkspaceScope()

  const items = React.useMemo(
    () => filterContentByScope(mockContentItems, scope),
    [scope],
  )

  const stats = React.useMemo(() => {
    return {
      draft: countByStatus(items, "draft"),
      scheduled: countByStatus(items, "scheduled"),
      published: countByStatus(items, "published"),
      idea: countByStatus(items, "idea"),
    }
  }, [items])

  const recent = React.useMemo(() => {
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 8)
  }, [items])

  return (
    <div className="space-y-6">
      <PageIntro
        title="總覽"
        description="依頂端「範圍」檢視內容管線狀態與最近更新；數字為目前範圍內的 editorial 素材。"
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="靈感" value={stats.idea} hint="尚未成稿" />
        <StatCard label="草稿" value={stats.draft} hint="撰寫中" />
        <StatCard label="已排程" value={stats.scheduled} hint="含排程時間" />
        <StatCard label="已發佈" value={stats.published} hint="已上線" />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">最近更新</h2>
        {recent.length === 0 ? (
          <EmptyState
            title="此範圍內尚無內容"
            reason="可能是尚未建立素材，或目前範圍／帳號下沒有對應項目。"
            suggestion="請在頂端切換「全部客戶」、其他客戶／品牌，或到 Instagram 新增一則貼文。"
          />
        ) : (
          <ul className="divide-border/60 divide-y rounded-lg border">
            {recent.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium">{row.title}</span>
                <span className="text-muted-foreground flex gap-3 text-xs">
                  <span>{contentStatusLabel[row.status]}</span>
                  <span className="tabular-nums">{row.updatedAt.slice(0, 10)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <Card size="sm" className="ring-foreground/8 shadow-none">
      <div className="px-4 py-3">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
          {value}
        </p>
        <p className="text-muted-foreground/80 mt-0.5 text-[11px]">{hint}</p>
      </div>
    </Card>
  )
}
