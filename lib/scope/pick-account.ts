import type { SocialAccount, WorkspaceScope } from "@/lib/types/agency"
import type { ContentPlatform } from "@/lib/types/dashboard"

function hashSlot(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h.toString(16).slice(0, 10)
}

/**
 * 由 `content_items` 查到的 distinct `position` 產生候選 `SocialAccount`（id 為穩定合成，**非** DB 主鍵）。
 * 若無任何 position，候選為空，呼叫端應請使用者手動輸入／改選範圍。
 */
export function socialAccountsFromPositionHints(
  clientId: string,
  platform: ContentPlatform,
  distinctPositions: string[],
): SocialAccount[] {
  const brandId = `br-${clientId}`
  return distinctPositions.map((pos) => ({
    id: `acc-${clientId}-${platform}-${hashSlot(pos)}`,
    name: pos,
    platform,
    handle: pos,
    clientId,
    brandId,
  }))
}

/**
 * 從真實候選帳號列挑一筆；若無候選回傳 `null`（勿寫入示範用 mock id）。
 */
export function pickAccountForNewPost(
  scope: WorkspaceScope,
  platform: ContentPlatform,
  candidates: SocialAccount[],
): SocialAccount | null {
  const pool = candidates.filter((a) => a.platform === platform)
  if (pool.length === 0) return null

  if (scope.mode === "account") {
    const hit = pool.find((a) => a.id === scope.accountId)
    if (hit) return hit
  }

  if (scope.mode === "brand") {
    const hit = pool.find((a) => a.brandId === scope.brandId)
    if (hit) return hit
  }

  if (scope.mode === "client") {
    const hit = pool.find((a) => a.clientId === scope.clientId)
    if (hit) return hit
  }

  return pool[0] ?? null
}
