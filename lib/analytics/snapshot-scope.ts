import type { SocialAccount } from "@/lib/types/agency"
import type { WorkspaceScope } from "@/lib/types/agency"
import type {
  AnalyticsSnapshot,
  FollowerTrendPoint,
  PerformanceByPeriodRow,
  TopPerformingPost,
} from "@/lib/types/analytics"
import { mockSocialAccounts } from "@/lib/mock/agency"

function seed(id: string, salt = ""): number {
  let h = 0
  const s = id + salt
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h / 2 ** 32
}

export function deriveAccountSnapshot(
  base: AnalyticsSnapshot,
  account: SocialAccount,
): AnalyticsSnapshot {
  const scale = 0.14 + seed(account.id, "kpi") * 0.22
  const fOff = Math.floor(seed(account.id, "fol") * 8000)

  const topForAccount = base.topPosts.filter((p) => p.accountId === account.id)
  const topPosts: TopPerformingPost[] =
    topForAccount.length > 0
      ? topForAccount
      : [
          {
            id: `synth-${account.id}`,
            title: `${account.name} · 代表貼文`,
            platform: account.platform,
            impressions: Math.round(base.kpis.peakPostImpressions * scale),
            engagementRate: Math.min(
              0.15,
              base.kpis.engagementRate * (0.9 + seed(account.id, "e") * 0.2),
            ),
            publishedAt: "2026-04-08T12:00:00.000Z",
            clientId: account.clientId,
            brandId: account.brandId,
            accountId: account.id,
          },
        ]

  return {
    ...base,
    kpis: {
      totalImpressions: Math.round(base.kpis.totalImpressions * scale),
      engagementRate: Math.min(
        0.14,
        base.kpis.engagementRate * (0.88 + seed(account.id, "er") * 0.15),
      ),
      followerGrowth: Math.round(base.kpis.followerGrowth * scale),
      peakPostImpressions: Math.round(
        base.kpis.peakPostImpressions * scale,
      ),
    },
    performanceByPeriod: base.performanceByPeriod.map((r) => ({
      ...r,
      impressions: Math.round(r.impressions * scale),
      engagements: Math.round(r.engagements * scale),
    })),
    followerTrend: base.followerTrend.map((p, i) => ({
      ...p,
      followers: Math.round(p.followers * scale + fOff + i * 2),
    })),
    topPosts: topPosts
      .slice()
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 8),
  }
}

export function aggregateSnapshots(snapshots: AnalyticsSnapshot[]): AnalyticsSnapshot {
  if (snapshots.length === 0) {
    throw new Error("aggregateSnapshots: empty")
  }
  if (snapshots.length === 1) return snapshots[0]

  const range = snapshots[0].range
  const totalImp = snapshots.reduce((s, x) => s + x.kpis.totalImpressions, 0)
  const weightedEng =
    totalImp > 0
      ? snapshots.reduce(
          (s, x) => s + x.kpis.engagementRate * x.kpis.totalImpressions,
          0,
        ) / totalImp
      : 0

  const peakPostImpressions = Math.max(
    ...snapshots.map((s) => s.kpis.peakPostImpressions),
  )

  const n = snapshots[0].performanceByPeriod.length
  const performanceByPeriod: PerformanceByPeriodRow[] = []
  for (let i = 0; i < n; i++) {
    performanceByPeriod.push({
      label: snapshots[0].performanceByPeriod[i].label,
      impressions: snapshots.reduce(
        (s, x) => s + x.performanceByPeriod[i].impressions,
        0,
      ),
      engagements: snapshots.reduce(
        (s, x) => s + x.performanceByPeriod[i].engagements,
        0,
      ),
    })
  }

  const m = snapshots[0].followerTrend.length
  const followerTrend: FollowerTrendPoint[] = []
  for (let i = 0; i < m; i++) {
    const avg =
      snapshots.reduce((s, x) => s + x.followerTrend[i].followers, 0) /
      snapshots.length
    followerTrend.push({
      date: snapshots[0].followerTrend[i].date,
      followers: Math.round(avg),
    })
  }

  const topPosts = snapshots
    .flatMap((s) => s.topPosts)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)

  return {
    range,
    kpis: {
      totalImpressions: snapshots.reduce(
        (s, x) => s + x.kpis.totalImpressions,
        0,
      ),
      engagementRate: weightedEng,
      followerGrowth: snapshots.reduce(
        (s, x) => s + x.kpis.followerGrowth,
        0,
      ),
      peakPostImpressions,
    },
    performanceByPeriod,
    followerTrend,
    topPosts,
  }
}

export function resolveAnalyticsForScope(
  base: AnalyticsSnapshot,
  scope: WorkspaceScope,
): AnalyticsSnapshot {
  if (scope.mode === "all") return base

  if (scope.mode === "account") {
    const acc = mockSocialAccounts.find((a) => a.id === scope.accountId)
    if (!acc) return base
    return deriveAccountSnapshot(base, acc)
  }

  const subset = mockSocialAccounts.filter((a) => {
    if (scope.mode === "client") return a.clientId === scope.clientId
    return a.brandId === scope.brandId
  })
  if (subset.length === 0) return base
  const derived = subset.map((a) => deriveAccountSnapshot(base, a))
  return aggregateSnapshots(derived)
}
