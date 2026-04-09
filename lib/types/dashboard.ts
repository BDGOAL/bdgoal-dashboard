/**
 * Dashboard domain types — extend as features ship.
 */

export type DashboardNavItem = {
  title: string
  href: string
  id: string
}

export type DashboardOverviewStats = {
  label: string
  value: string
  trend?: "up" | "down" | "neutral"
}

/** Supported publishing platforms */
export const CONTENT_PLATFORMS = [
  "instagram",
  "youtube",
  "tiktok",
  "x",
  "threads",
] as const
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number]

/** Editorial / pipeline status */
export const CONTENT_STATUSES = [
  "idea",
  "draft",
  "scheduled",
  "published",
] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

/** Post format — oriented to short-form social */
export const CONTENT_POST_TYPES = [
  "feed",
  "carousel",
  "reels",
  "story",
  "short",
] as const
export type ContentPostType = (typeof CONTENT_POST_TYPES)[number]

/** Full content record for CMS-style workflows */
export type ContentItem = {
  id: string
  source?: "asana" | "manual" | "mock"
  sourceRef?: {
    asanaTaskId?: string
  }
  title: string
  platform: ContentPlatform
  postType: ContentPostType
  contentTypeName?: string | null
  position?: string | null
  clientName?: string | null
  caption: string
  status: ContentStatus
  plannedPublishDate?: string | null
  scheduledAt: string | null
  publishedAt: string | null
  updatedAt: string
  createdAt?: string
  tags: string[]
  thumbnail: string | null
  author: string
  attachments?: Array<{
    name: string
    url: string
  }>
  localNotes?: string | null
  /** Agency scope — which client / brand / social account owns this asset */
  clientId: string
  brandId: string
  accountId: string
}

/** Slim row for dashboard overview */
export type ContentPreview = Pick<
  ContentItem,
  "id" | "title" | "status" | "updatedAt"
>
