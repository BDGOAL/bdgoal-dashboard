/**
 * 解析「新增內容」API 所需客戶**名稱字串**（`ensureClientExists`），僅依 API 與已載入 `ContentItem`，不使用 mock agency 表。
 */
import type { WorkspaceScope } from "@/lib/types/agency"
import type { ContentItem, ContentPlatform } from "@/lib/types/dashboard"

export type ResolveClientLabelResult =
  | {
      ok: true
      clientLabelForApi: string
      resolution: "api_clients" | "content_item"
    }
  | { ok: false; message: string }

function latestItemForPlatform(
  items: ContentItem[],
  platform: ContentPlatform,
): ContentItem | undefined {
  const pool = items.filter((i) => i.platform === platform)
  if (pool.length === 0) return undefined
  return [...pool].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]
}

/**
 * 解析「新增內容」要送出的客戶字串（`ensureClientExists` 用）。
 * 與 {@link pickAccountForNewPost} 分離：後者僅處理帳號維度候選，**不得**將示範 id 寫入 DB。
 */
export function resolveClientLabelForNewPost(input: {
  scope: WorkspaceScope
  apiClientName: string | null | undefined
  workspaceContentItems: ContentItem[]
  platform: ContentPlatform
}): ResolveClientLabelResult {
  const { scope, apiClientName, workspaceContentItems, platform } = input

  if (scope.mode === "client") {
    const fromApi = apiClientName?.trim()
    if (fromApi) {
      return { ok: true, clientLabelForApi: fromApi, resolution: "api_clients" }
    }
    const hit = workspaceContentItems.find((i) => i.clientId === scope.clientId)
    const fromItem = hit?.clientName?.trim()
    if (fromItem) {
      return { ok: true, clientLabelForApi: fromItem, resolution: "content_item" }
    }
    return {
      ok: false,
      message:
        "無法解析客戶名稱。請確認已登入、頂端選擇的客戶正確，或稍後再試。",
    }
  }

  if (scope.mode === "brand") {
    const hit = workspaceContentItems.find((i) => i.brandId === scope.brandId)
    const fromItem = hit?.clientName?.trim()
    if (fromItem) {
      return { ok: true, clientLabelForApi: fromItem, resolution: "content_item" }
    }
    return { ok: false, message: "無法解析此品牌對應的客戶，請改選客戶或確認資料。" }
  }

  if (scope.mode === "account") {
    const hit = workspaceContentItems.find((i) => i.accountId === scope.accountId)
    const fromItem = hit?.clientName?.trim()
    if (fromItem) {
      return { ok: true, clientLabelForApi: fromItem, resolution: "content_item" }
    }
    return { ok: false, message: "無法解析此帳號對應的客戶，請改選客戶或確認資料。" }
  }

  const latest = latestItemForPlatform(workspaceContentItems, platform)
  const fromLatest = latest?.clientName?.trim()
  if (fromLatest) {
    return { ok: true, clientLabelForApi: fromLatest, resolution: "content_item" }
  }
  return {
    ok: false,
    message: "請先在頂端「範圍」選擇客戶，或先匯入／建立至少一筆該平台的內容，再新增貼文。",
  }
}
