import type { WorkspaceScope } from "@/lib/types/agency"
import type {
  AnalyticsDateRange,
  AnalyticsSnapshot,
} from "@/lib/types/analytics"
import { resolveAnalyticsForScope } from "@/lib/analytics/snapshot-scope"

const IG = {
  clientId: "cl-aurora",
  brandId: "br-aurora-main",
  accountId: "acc-aurora-ig",
} as const
const AURORA_YT = {
  clientId: "cl-aurora",
  brandId: "br-aurora-main",
  accountId: "acc-aurora-yt",
} as const
const TEA_TH = {
  clientId: "cl-aurora",
  brandId: "br-aurora-tea",
  accountId: "acc-tea-th",
} as const
const PULSE_YT = {
  clientId: "cl-pulse",
  brandId: "br-pulse-core",
  accountId: "acc-pulse-yt",
} as const
const PULSE_X = {
  clientId: "cl-pulse",
  brandId: "br-pulse-core",
  accountId: "acc-pulse-x",
} as const
const PULSE_TT = {
  clientId: "cl-pulse",
  brandId: "br-pulse-core",
  accountId: "acc-pulse-tt",
} as const

/**
 * Agency-wide aggregate (all clients) — Metricool-style mock.
 * Top posts include clientId / brandId / accountId for scope filtering.
 */
export const ANALYTICS_BASE_SNAPSHOTS: Record<
  AnalyticsDateRange,
  AnalyticsSnapshot
> = {
  "7d": {
    range: "7d",
    kpis: {
      totalImpressions: 128_400,
      engagementRate: 0.041,
      followerGrowth: 428,
      peakPostImpressions: 41_200,
    },
    performanceByPeriod: [
      { label: "4/3", impressions: 16_200, engagements: 640 },
      { label: "4/4", impressions: 14_800, engagements: 590 },
      { label: "4/5", impressions: 19_100, engagements: 810 },
      { label: "4/6", impressions: 21_400, engagements: 902 },
      { label: "4/7", impressions: 18_300, engagements: 745 },
      { label: "4/8", impressions: 22_600, engagements: 940 },
      { label: "4/9", impressions: 16_000, engagements: 655 },
    ],
    followerTrend: [
      { date: "2026-04-03", followers: 48_920 },
      { date: "2026-04-04", followers: 49_050 },
      { date: "2026-04-05", followers: 49_210 },
      { date: "2026-04-06", followers: 49_380 },
      { date: "2026-04-07", followers: 49_500 },
      { date: "2026-04-08", followers: 49_720 },
      { date: "2026-04-09", followers: 49_920 },
    ],
    topPosts: [
      {
        id: "a-1",
        title: "春季活動貼文",
        platform: "instagram",
        impressions: 41_200,
        engagementRate: 0.052,
        publishedAt: "2026-04-08T08:00:00.000Z",
        ...IG,
      },
      {
        id: "a-2",
        title: "Reels 開箱精華",
        platform: "instagram",
        impressions: 36_800,
        engagementRate: 0.048,
        publishedAt: "2026-04-07T14:00:00.000Z",
        ...IG,
      },
      {
        id: "a-3",
        title: "Shorts 導流剪輯",
        platform: "youtube",
        impressions: 28_400,
        engagementRate: 0.039,
        publishedAt: "2026-04-06T11:00:00.000Z",
        ...PULSE_YT,
      },
      {
        id: "a-4",
        title: "Threads 長文串",
        platform: "threads",
        impressions: 12_100,
        engagementRate: 0.061,
        publishedAt: "2026-04-05T09:30:00.000Z",
        ...TEA_TH,
      },
      {
        id: "a-5",
        title: "TikTok 話題挑戰",
        platform: "tiktok",
        impressions: 9_900,
        engagementRate: 0.072,
        publishedAt: "2026-04-04T16:00:00.000Z",
        ...PULSE_TT,
      },
    ],
  },
  "30d": {
    range: "30d",
    kpis: {
      totalImpressions: 502_600,
      engagementRate: 0.038,
      followerGrowth: 1_842,
      peakPostImpressions: 96_400,
    },
    performanceByPeriod: [
      { label: "第1週", impressions: 112_000, engagements: 4_200 },
      { label: "第2週", impressions: 128_400, engagements: 4_890 },
      { label: "第3週", impressions: 118_200, engagements: 4_510 },
      { label: "第4週", impressions: 144_000, engagements: 5_480 },
    ],
    followerTrend: Array.from({ length: 30 }, (_, i) => {
      const day = i + 1
      const d = `2026-04-${String(day).padStart(2, "0")}`
      return {
        date: d,
        followers: 47_200 + i * 92 + (i % 5) * 17,
      }
    }),
    topPosts: [
      {
        id: "b-1",
        title: "聯名預告貼文",
        platform: "instagram",
        impressions: 96_400,
        engagementRate: 0.055,
        publishedAt: "2026-04-02T12:00:00.000Z",
        ...IG,
      },
      {
        id: "b-2",
        title: "品牌幕後 Reels",
        platform: "instagram",
        impressions: 82_100,
        engagementRate: 0.049,
        publishedAt: "2026-03-28T09:00:00.000Z",
        ...IG,
      },
      {
        id: "b-3",
        title: "X 快訊整理",
        platform: "x",
        impressions: 54_300,
        engagementRate: 0.033,
        publishedAt: "2026-03-25T15:20:00.000Z",
        ...PULSE_X,
      },
      {
        id: "b-4",
        title: "YT Shorts 合集",
        platform: "youtube",
        impressions: 47_900,
        engagementRate: 0.041,
        publishedAt: "2026-03-22T10:00:00.000Z",
        ...PULSE_YT,
      },
      {
        id: "b-5",
        title: "限動精選回顧",
        platform: "instagram",
        impressions: 31_200,
        engagementRate: 0.044,
        publishedAt: "2026-03-18T08:00:00.000Z",
        ...IG,
      },
      {
        id: "b-6",
        title: "社群 FAQ 貼文",
        platform: "threads",
        impressions: 18_700,
        engagementRate: 0.058,
        publishedAt: "2026-03-15T11:45:00.000Z",
        ...TEA_TH,
      },
    ],
  },
  "90d": {
    range: "90d",
    kpis: {
      totalImpressions: 1_418_000,
      engagementRate: 0.035,
      followerGrowth: 4_960,
      peakPostImpressions: 210_000,
    },
    performanceByPeriod: [
      { label: "1月", impressions: 420_000, engagements: 14_200 },
      { label: "2月", impressions: 458_000, engagements: 15_100 },
      { label: "3月", impressions: 512_000, engagements: 16_800 },
      { label: "4月", impressions: 28_000, engagements: 980 },
    ],
    followerTrend: [
      { date: "2026-01-15", followers: 42_100 },
      { date: "2026-02-01", followers: 43_800 },
      { date: "2026-02-15", followers: 44_900 },
      { date: "2026-03-01", followers: 45_700 },
      { date: "2026-03-15", followers: 47_200 },
      { date: "2026-04-01", followers: 48_400 },
      { date: "2026-04-09", followers: 49_920 },
    ],
    topPosts: [
      {
        id: "c-1",
        title: "年度回顧長影片",
        platform: "youtube",
        impressions: 210_000,
        engagementRate: 0.046,
        publishedAt: "2026-02-10T12:00:00.000Z",
        ...AURORA_YT,
      },
      {
        id: "c-2",
        title: "春節活動主貼文",
        platform: "instagram",
        impressions: 188_000,
        engagementRate: 0.051,
        publishedAt: "2026-01-22T08:00:00.000Z",
        ...IG,
      },
      {
        id: "c-3",
        title: "新品上市直播精華",
        platform: "instagram",
        impressions: 142_500,
        engagementRate: 0.042,
        publishedAt: "2026-03-05T19:00:00.000Z",
        ...IG,
      },
      {
        id: "c-4",
        title: "KOL 合作 Reels",
        platform: "instagram",
        impressions: 119_000,
        engagementRate: 0.056,
        publishedAt: "2026-02-28T14:30:00.000Z",
        ...IG,
      },
      {
        id: "c-5",
        title: "TikTok 品牌曲挑戰",
        platform: "tiktok",
        impressions: 96_200,
        engagementRate: 0.081,
        publishedAt: "2026-03-12T20:00:00.000Z",
        ...PULSE_TT,
      },
    ],
  },
}

export function getAnalyticsSnapshot(
  range: AnalyticsDateRange,
  scope: WorkspaceScope = { mode: "all" },
): AnalyticsSnapshot {
  const base = ANALYTICS_BASE_SNAPSHOTS[range]
  return resolveAnalyticsForScope(base, scope)
}

export const ANALYTICS_RANGE_OPTIONS: {
  value: AnalyticsDateRange
  label: string
}[] = [
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
]
