import type { SocialAccount, WorkspaceScope } from "@/lib/types/agency"
import type { ContentPlatform } from "@/lib/types/dashboard"

/** Pick which social account new editorial content should attach to for the current scope. */
export function pickAccountForNewPost(
  scope: WorkspaceScope,
  platform: ContentPlatform,
  accounts: SocialAccount[],
): SocialAccount {
  const pool = accounts.filter((a) => a.platform === platform)
  if (pool.length === 0) {
    throw new Error(`No mock account for platform ${platform}`)
  }

  if (scope.mode === "account") {
    const hit = accounts.find((a) => a.id === scope.accountId)
    if (hit && hit.platform === platform) return hit
  }

  if (scope.mode === "brand") {
    const hit = pool.find((a) => a.brandId === scope.brandId)
    if (hit) return hit
  }

  if (scope.mode === "client") {
    const hit = pool.find((a) => a.clientId === scope.clientId)
    if (hit) return hit
  }

  return pool[0]
}
