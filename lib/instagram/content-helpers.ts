import type { ContentItem, ContentStatus } from "@/lib/types/dashboard"

export function filterByPlatform(
  items: ContentItem[],
  platform: ContentItem["platform"],
): ContentItem[] {
  return items.filter((i) => i.platform === platform)
}

export function countByStatus(
  items: ContentItem[],
  status: ContentStatus,
): number {
  return items.filter((i) => i.status === status).length
}

export function itemsWithStatus(
  items: ContentItem[],
  status: ContentStatus,
): ContentItem[] {
  return items
    .filter((i) => i.status === status)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

/** Which timestamp to surface in list cards */
export function getContentDisplayDate(item: ContentItem): string {
  if (item.status === "scheduled" && item.scheduledAt) {
    return formatDateTime(item.scheduledAt)
  }
  if (item.status === "published") {
    if (item.publishedAt) return formatDateTime(item.publishedAt)
    return formatDateTime(item.updatedAt)
  }
  return formatDateTime(item.updatedAt)
}
