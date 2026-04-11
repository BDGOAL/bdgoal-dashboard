import type { WorkspaceScope } from "@/lib/types/agency"
import type { ContentItem } from "@/lib/types/dashboard"

function clientNameFromContentItems(
  scope: WorkspaceScope,
  contentItems: ContentItem[] | undefined,
): string | null {
  if (scope.mode !== "client" || !contentItems?.length) return null
  const hit = contentItems.find((i) => i.clientId === scope.clientId)
  const n = hit?.clientName?.trim()
  return n || null
}

/** Short label for filter chips and hints */
export function getScopeShortLabel(
  scope: WorkspaceScope,
  contentItems?: ContentItem[],
): string {
  if (scope.mode === "all") return "全部客戶"

  if (scope.mode === "client") {
    const fromData = clientNameFromContentItems(scope, contentItems)
    if (fromData) return fromData
    return `客戶 · ${scope.clientId.slice(0, 8)}…`
  }

  if (scope.mode === "brand") {
    return `品牌 · ${scope.brandId.slice(0, 12)}…`
  }

  return `帳號 · ${scope.accountId.slice(0, 12)}…`
}

/** One-line description for page intros */
export function getScopeLine(
  scope: WorkspaceScope,
  contentItems?: ContentItem[],
): string {
  if (scope.mode === "all") {
    return "目前顯示所有可存取客戶的內容與指標。"
  }
  if (scope.mode === "client") {
    const fromData = clientNameFromContentItems(scope, contentItems)
    const label = fromData ?? `客戶（${scope.clientId.slice(0, 8)}…）`
    return `僅顯示與「${label}」相關的內容與指標。`
  }
  if (scope.mode === "brand") {
    return `僅顯示與所選品牌範圍（${scope.brandId.slice(0, 12)}…）相關的資料。`
  }
  return `僅顯示與所選社群帳號範圍（${scope.accountId.slice(0, 12)}…）相關的內容與分析。`
}
