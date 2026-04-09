import type { SocialAccount } from "@/lib/types/agency"
import type { WorkspaceScope } from "@/lib/types/agency"
import type { CompetitorRecord } from "@/lib/types/competitor"
import { mockSocialAccounts } from "@/lib/mock/agency"

export function filterCompetitorsByScope(
  competitors: CompetitorRecord[],
  scope: WorkspaceScope,
  accounts: SocialAccount[] = mockSocialAccounts,
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
