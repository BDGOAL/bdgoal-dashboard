import {
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  type ContentItem,
  type ContentPlatform,
  type ContentStatus,
} from "@/lib/types/dashboard"

const MS_DAY = 86_400_000

const UNNAMED_CLIENT_LABEL = "\u672a\u547d\u540d\u5ba2\u6236"

export type ClientBucket = { key: string; label: string; count: number }

export type ContentOpsSnapshot = {
  total: number
  planning: number
  scheduled: number
  published: number
  /** Created or updated in the rolling last 7 days. */
  touchedLast7d: number
  byPlatform: { platform: ContentPlatform; count: number }[]
  byStatus: { status: ContentStatus; count: number }[]
  byClient: ClientBucket[]
  recentActivity: ContentItem[]
}

export function buildContentOpsSnapshot(items: ContentItem[]): ContentOpsSnapshot {
  const now = Date.now()
  const cutoff = now - 7 * MS_DAY

  let planning = 0
  let scheduled = 0
  let published = 0
  let touchedLast7d = 0

  const platCounts = Object.fromEntries(
    CONTENT_PLATFORMS.map((p) => [p, 0]),
  ) as Record<ContentPlatform, number>
  const statCounts = Object.fromEntries(
    CONTENT_STATUSES.map((s) => [s, 0]),
  ) as Record<ContentStatus, number>
  const clientMap = new Map<string, { label: string; count: number }>()

  for (const item of items) {
    if (item.status === "idea" || item.status === "draft") planning++
    else if (item.status === "scheduled") scheduled++
    else if (item.status === "published") published++

    const upd = new Date(item.updatedAt).getTime()
    const crt = item.createdAt ? new Date(item.createdAt).getTime() : null
    if (upd >= cutoff || (crt != null && crt >= cutoff)) {
      touchedLast7d++
    }

    platCounts[item.platform]++
    statCounts[item.status]++

    const ck = item.clientId
    const incoming = item.clientName?.trim()
    const cur = clientMap.get(ck) ?? { label: UNNAMED_CLIENT_LABEL, count: 0 }
    cur.count++
    if (incoming) cur.label = incoming
    clientMap.set(ck, cur)
  }

  const byClient: ClientBucket[] = [...clientMap.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)

  const byPlatform = CONTENT_PLATFORMS.map((platform) => ({
    platform,
    count: platCounts[platform],
  })).filter((x) => x.count > 0)

  const byStatus = CONTENT_STATUSES.map((status) => ({
    status,
    count: statCounts[status],
  })).filter((x) => x.count > 0)

  const recentActivity = [...items]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 12)

  return {
    total: items.length,
    planning,
    scheduled,
    published,
    touchedLast7d,
    byPlatform,
    byStatus,
    byClient,
    recentActivity,
  }
}
