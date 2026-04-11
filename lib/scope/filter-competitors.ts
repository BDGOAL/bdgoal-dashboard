import type { SocialAccount } from "@/lib/types/agency"
import type { WorkspaceScope } from "@/lib/types/agency"
import type { CompetitorRecord } from "@/lib/types/competitor"

export function filterCompetitorsByScope(
  competitors: CompetitorRecord[],
  scope: WorkspaceScope,
  /** 帳號→品牌對照；空陣列時 account 範圍無法解析品牌 */
  accounts: SocialAccount[] = [],
): CompetitorRecord[] {
  if (scope.mode === "all") return competitors

  if (scope.mode === "client") {
    return competitors.filter((c) => c.clientId === scope.clientId)
  }

  if (scope.mode === "brand") {
    return competitors.filter((c) => c.brandId === scope.brandId)
  }

  const acc = accounts.find((a) => a.id === scope.accountId)
  if (!acc) return []
  return competitors.filter((c) => c.brandId === acc.brandId)
}
