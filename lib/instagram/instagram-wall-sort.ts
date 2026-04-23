import type { ContentItem } from "@/lib/types/dashboard"

/**
 * Instagram 牆面排序（row-major，索引小者在前）：
 * - 若存在完整顯式排序（`instagramOrder` 為 0..n-1，無缺漏），按 `instagramOrder` 升序。
 *   => `instagramOrder = 0` 會出現在左上角，1 在上排下一格，依序 row-major。
 * - 否則（缺漏/null/非完整序列）以 `updatedAt` 新者在前作為 fallback（降序），
 *   與 Instagram profile grid 一致：最新在左上，最舊在右下（row-major）。
 */
export function sortInstagramWallItems(items: ContentItem[]): ContentItem[] {
  const nums = items
    .map((i) => i.instagramOrder)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
  const hasCompleteExplicitOrder =
    nums.length === items.length &&
    nums.every((n) => n >= 0 && Number.isInteger(n)) &&
    new Set(nums).size === nums.length &&
    Math.min(...nums) === 0 &&
    Math.max(...nums) === items.length - 1

  return [...items].sort((a, b) => {
    const ao = a.instagramOrder
    const bo = b.instagramOrder
    if (hasCompleteExplicitOrder && ao != null && bo != null && ao !== bo) {
      return ao - bo
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
