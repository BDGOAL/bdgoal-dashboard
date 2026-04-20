import type { WorkspaceScope } from "@/lib/types/agency"
import type { ContentItem } from "@/lib/types/dashboard"

export function isInstagramClientScope(
  scope: WorkspaceScope,
): scope is { mode: "client"; clientId: string } {
  return scope.mode === "client"
}

/** Instagram 規劃僅顯示：單一客戶 + 平台 Instagram（小寫與型別一致）。 */
export function filterInstagramItemsForClient(
  items: ContentItem[],
  clientId: string,
): ContentItem[] {
  return items.filter(
    (i) => i.platform === "instagram" && i.clientId === clientId,
  )
}
