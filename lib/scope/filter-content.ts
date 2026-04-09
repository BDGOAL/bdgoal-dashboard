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
