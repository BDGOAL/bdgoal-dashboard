/**
 * 依頂端 WorkspaceScope 篩選內容。
 * `brand`／`account` 模式比對的是 `ContentItem.brandId`／`accountId`（Dashboard 內部／示範對照），
 * **不是** Asana custom field；不得與 Asana 同步語意混談。
 */
import type { WorkspaceScope } from "@/lib/types/agency"
import type { ContentItem } from "@/lib/types/dashboard"

export function filterContentByScope(
  items: ContentItem[],
  scope: WorkspaceScope,
): ContentItem[] {
  if (scope.mode === "all") return items
  if (scope.mode === "client") {
    return items.filter((i) => i.clientId === scope.clientId)
  }
  if (scope.mode === "brand") {
    return items.filter((i) => i.brandId === scope.brandId)
  }
  return items.filter((i) => i.accountId === scope.accountId)
}
