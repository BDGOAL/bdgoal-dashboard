import type { ContentItem } from "@/lib/types/dashboard"

/**
 * Instagram 牆面排序：`instagram_order` 升序（null 視為最大），同序則 `updatedAt` 新者在前。
 */
export function sortInstagramWallItems(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) => {
    const ao = a.instagramOrder
    const bo = b.instagramOrder
    const aNull = ao == null
    const bNull = bo == null
    if (aNull && bNull) {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
    if (aNull) return 1
    if (bNull) return -1
    if (ao !== bo) return ao - bo
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
