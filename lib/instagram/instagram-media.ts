import type { ContentItem } from "@/lib/types/dashboard"

export function getInstagramPrimaryImageUrl(item: ContentItem): string | null {
  const fromAttachment = item.attachments?.[0]?.url?.trim()
  if (fromAttachment) return fromAttachment
  return item.thumbnail?.trim() || null
}

export function truncateInstagramCaption(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (!t) return ""
  if (t.length <= maxChars) return t
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`
}
