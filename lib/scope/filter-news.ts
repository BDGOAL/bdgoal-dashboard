import type { Brand } from "@/lib/types/agency"
import type { SocialAccount } from "@/lib/types/agency"
import type { WorkspaceScope } from "@/lib/types/agency"
import type { NewsItem } from "@/lib/types/news"
import { mockBrands, mockSocialAccounts } from "@/lib/mock/agency"

function isAgencyWideBriefing(item: NewsItem): boolean {
  return item.clientIds.length === 0 && item.brandIds.length === 0
}

function brandBelongsToClient(brandId: string, clientId: string, brands: Brand[]) {
  return brands.find((b) => b.id === brandId)?.clientId === clientId
}

/**
 * News can tag whole clients, specific brands, or (in「全部」only) agency-wide rows.
 */
export function filterNewsByScope(
  items: NewsItem[],
  scope: WorkspaceScope,
  brands: Brand[] = mockBrands,
  accounts: SocialAccount[] = mockSocialAccounts,
): NewsItem[] {
  if (scope.mode === "all") {
    return items
  }

  return items.filter((item) => {
    if (isAgencyWideBriefing(item)) return false

    if (scope.mode === "client") {
      if (item.clientIds.includes(scope.clientId)) return true
      return item.brandIds.some((bid) =>
        brandBelongsToClient(bid, scope.clientId, brands),
      )
    }

    if (scope.mode === "brand") {
      const br = brands.find((b) => b.id === scope.brandId)
      if (!br) return false
      if (item.brandIds.includes(scope.brandId)) return true
      return (
        item.clientIds.includes(br.clientId) && item.brandIds.length === 0
      )
    }

    const acc = accounts.find((a) => a.id === scope.accountId)
    if (!acc) return false
    if (item.brandIds.includes(acc.brandId)) return true
    return item.clientIds.includes(acc.clientId)
  })
}
