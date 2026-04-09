import type { ContentPlatform } from "@/lib/types/dashboard"

export type CompetitorTrend = "up" | "down" | "flat"

/** Tracked peer brand / account (mock public-style metrics) */
export type CompetitorRecord = {
  id: string
  name: string
  platform: ContentPlatform
  handle: string
  clientId: string
  brandId: string
  /** Posts observed in the mock window (e.g. last 7d) */
  recentPosts: number
  /** Engagement rate 0–1 */
  engagement: number
  /** Human-readable cadence */
  postingFrequency: string
  /** Net follower change in the mock window */
  followerGrowth: number
  trendDirection: CompetitorTrend
  /** Optional blurb for expandable detail */
  notes?: string
}
