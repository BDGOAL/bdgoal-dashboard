import type { ContentPlatform } from "@/lib/types/dashboard"

/** Report window (Metricool-style presets) */
export type AnalyticsDateRange = "7d" | "30d" | "90d"

export type AnalyticsKpis = {
  totalImpressions: number
  /** Decimal 0–1 (e.g. 0.042 = 4.2%) */
  engagementRate: number
  /** Net new followers in the window */
  followerGrowth: number
  /** Strongest single post in the window (reach) */
  peakPostImpressions: number
}

/** Bar chart: performance buckets within the window */
export type PerformanceByPeriodRow = {
  label: string
  impressions: number
  engagements: number
}

export type FollowerTrendPoint = {
  /** ISO date (date-only semantics) */
  date: string
  followers: number
}

export type TopPerformingPost = {
  id: string
  title: string
  platform: ContentPlatform
  impressions: number
  engagementRate: number
  publishedAt: string
  clientId: string
  brandId: string
  accountId: string
}

export type AnalyticsSnapshot = {
  range: AnalyticsDateRange
  kpis: AnalyticsKpis
  performanceByPeriod: PerformanceByPeriodRow[]
  followerTrend: FollowerTrendPoint[]
  topPosts: TopPerformingPost[]
}
