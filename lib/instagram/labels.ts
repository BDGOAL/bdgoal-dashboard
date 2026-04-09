import type { ContentPostType, ContentStatus } from "@/lib/types/dashboard"

export const contentStatusLabel: Record<ContentStatus, string> = {
  idea: "靈感",
  draft: "草稿",
  scheduled: "已排程",
  published: "已發佈",
}

export const contentPostTypeLabel: Record<ContentPostType, string> = {
  feed: "貼文",
  carousel: "輪播",
  reels: "Reels",
  story: "限動",
  short: "Shorts",
}
