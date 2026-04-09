import type { WorkspaceScope } from "@/lib/types/agency"
import { mockBrands, mockClients, mockSocialAccounts } from "@/lib/mock/agency"
import { contentPlatformLabel } from "@/lib/calendar/labels"

/** Short label for filter chips and hints */
export function getScopeShortLabel(scope: WorkspaceScope): string {
  if (scope.mode === "all") return "全部客戶"

  if (scope.mode === "client") {
    const c = mockClients.find((x) => x.id === scope.clientId)
    return c?.name ?? "客戶"
  }

  if (scope.mode === "brand") {
    const b = mockBrands.find((x) => x.id === scope.brandId)
    const c = b ? mockClients.find((x) => x.id === b.clientId) : undefined
    if (b && c) return `${c.name} · ${b.name}`
    return b?.name ?? "品牌"
  }

  const a = mockSocialAccounts.find((x) => x.id === scope.accountId)
  if (a) return `${a.handle} · ${contentPlatformLabel[a.platform]}`
  return "帳號"
}

/** One-line description for page intros */
export function getScopeLine(scope: WorkspaceScope): string {
  if (scope.mode === "all") {
    return "目前顯示所有客戶、品牌與社群帳號的資料。"
  }
  if (scope.mode === "client") {
    const c = mockClients.find((x) => x.id === scope.clientId)
    return `僅顯示與「${c?.name ?? "此客戶"}」相關的內容與指標。`
  }
  if (scope.mode === "brand") {
    const b = mockBrands.find((x) => x.id === scope.brandId)
    const c = b ? mockClients.find((x) => x.id === b.clientId) : undefined
    return `僅顯示與「${c?.name ? `${c.name} · ` : ""}${b?.name ?? "此品牌"}」相關的資料。`
  }
  const a = mockSocialAccounts.find((x) => x.id === scope.accountId)
  if (a) {
    return `對應品牌「${mockBrands.find((b) => b.id === a.brandId)?.name ?? ""}」：顯示與此帳號同層級的內容與分析。`
  }
  return "請在頂端選擇有效的工作區範圍。"
}
