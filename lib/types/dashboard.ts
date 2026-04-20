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
    /** DB `content_attachments.id` when loaded from Supabase */
    id?: string
    name: string
    url: string
  }>
  localNotes?: string | null
  /**
   * 範圍篩選用 id（與 `clients.id` 對齊；來自匯入時 `ensureClientExists` 解析 Asana「Client」字串）。
   * Asana 任務本身沒有獨立 client id 欄位，此為 Dashboard 解析後結果。
   */
  clientId: string
  /**
   * 僅供 Dashboard UI 篩選（WorkspaceScope brand／account）。**非** Asana 欄位、也非 Asana 同步；
   * 由 `content-repository` 依 `client_id` + platform 推導或示範對照，不得當作 Asana truth。
   */
  brandId: string
  /**
   * 同上，Dashboard 內部維度／fallback，**非** Asana 社群帳號欄位。
   */
  accountId: string
  /**
   * `content_items.instagram_order`：同客戶＋Instagram 牆面由左而右、由上而下之順序（null 則排在已定序項目之後）。
   */
  instagramOrder?: number | null
}

/** Slim row for dashboard overview */
export type ContentPreview = Pick<
  ContentItem,
  "id" | "title" | "status" | "updatedAt"
>
