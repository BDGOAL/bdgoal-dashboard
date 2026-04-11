import type { WorkspaceScope } from "@/lib/types/agency"
import type { ContentItem } from "@/lib/types/dashboard"

/**
 * Instagram Grid 鎖定「單一客戶」：優先由已載入 `ContentItem` 解析；否則以範圍 id 顯示。
 */
export function resolveClientForInstagramGrid(
  scope: WorkspaceScope,
  items: ContentItem[],
): { id: string; name: string } | null {
  if (scope.mode === "all") return null

  if (scope.mode === "client") {
    const hit = items.find((i) => i.clientId === scope.clientId)
    const name =
      hit?.clientName?.trim() || `客戶 ${scope.clientId.slice(0, 8)}…`
    return { id: scope.clientId, name }
  }

  if (scope.mode === "brand") {
    const hit = items.find((i) => i.brandId === scope.brandId)
    if (hit) {
      return { id: hit.clientId, name: hit.clientName?.trim() || "已選客戶" }
    }
    return null
  }

  if (scope.mode === "account") {
    const hit = items.find((i) => i.accountId === scope.accountId)
    if (hit) {
      return { id: hit.clientId, name: hit.clientName?.trim() || "已選客戶" }
    }
    return null
  }

  return null
}
