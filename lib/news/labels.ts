import type {
  FollowUpPriority,
  NewsSignalType,
  NewsTopic,
  RelevanceLevel,
} from "@/lib/types/news"

export const newsTopicLabel: Record<NewsTopic, string> = {
  tools: "工具",
  research: "研究",
  business: "市場／商務",
}

export const newsSignalLabel: Record<NewsSignalType, string> = {
  "tool-update": "工具更新",
  "platform-update": "平台更新",
  "market-news": "市場新聞",
  "research-signal": "研究信號",
}

export const followUpLabel: Record<FollowUpPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
}

export const relevanceLabel: Record<RelevanceLevel, string> = {
  low: "低",
  medium: "中",
  high: "高",
}
