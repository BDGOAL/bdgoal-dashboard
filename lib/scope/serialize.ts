/**
 * URL／select 用的 scope 字串。`brand:`／`account:` 為歷史相容格式（頂端選單目前僅列出全部／真實客戶）。
 * **不是** Asana 匯入欄位。語意見 `lib/asana-dashboard-field-semantics.ts`。
 */
import type { WorkspaceScope } from "@/lib/types/agency"

export function serializeScope(s: WorkspaceScope): string {
  if (s.mode === "all") return "all"
  if (s.mode === "client") return `client:${s.clientId}`
  if (s.mode === "brand") return `brand:${s.brandId}`
  return `account:${s.accountId}`
}

export function parseScope(v: string): WorkspaceScope {
  if (v === "all" || v === "") return { mode: "all" }
  const i = v.indexOf(":")
  if (i < 0) return { mode: "all" }
  const kind = v.slice(0, i)
  const id = v.slice(i + 1)
  if (!id) return { mode: "all" }
  if (kind === "client") return { mode: "client", clientId: id }
  if (kind === "brand") return { mode: "brand", brandId: id }
  if (kind === "account") return { mode: "account", accountId: id }
  return { mode: "all" }
}
