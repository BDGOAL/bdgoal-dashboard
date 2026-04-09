export const NEWS_TOPICS = ["tools", "research", "business"] as const
export type NewsTopic = (typeof NEWS_TOPICS)[number]

export const NEWS_SIGNAL_TYPES = [
  "tool-update",
  "platform-update",
  "market-news",
  "research-signal",
] as const
export type NewsSignalType = (typeof NEWS_SIGNAL_TYPES)[number]

export const FOLLOW_UP_PRIORITIES = ["low", "medium", "high"] as const
export type FollowUpPriority = (typeof FOLLOW_UP_PRIORITIES)[number]

export const RELEVANCE_LEVELS = ["low", "medium", "high"] as const
export type RelevanceLevel = (typeof RELEVANCE_LEVELS)[number]

/** Industry / platform watchlist item (mock RSS-style) */
export type NewsItem = {
  id: string
  title: string
  source: string
  publishDate: string
  summary: string
  topic: NewsTopic
  relevanceLevel: RelevanceLevel
  followUpPriority: FollowUpPriority
  whyItMatters: string
  /** Empty = agency-wide briefing (only in「全部客戶」) */
  clientIds: string[]
  /** Empty with clientIds set = client-level only */
  brandIds: string[]
  signalType: NewsSignalType
  url: string
}
