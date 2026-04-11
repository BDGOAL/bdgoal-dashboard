"use client"

import * as React from "react"

import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { getScopeLine, getScopeShortLabel } from "@/lib/scope/scope-label"

/** 頂端範圍提示：真實客戶 id 時自 /api/clients 解析名稱，避免只顯示「客戶」。 */
export function ActiveScopeHint() {
  const { scope } = useWorkspaceScope()
  const [clientNames, setClientNames] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/clients", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as {
          clients?: { id: string; name: string }[]
        }
        if (!res.ok) return {}
        const map: Record<string, string> = {}
        for (const c of json.clients ?? []) {
          map[c.id] = c.name
        }
        return map
      })
      .then((map) => {
        if (!cancelled) setClientNames(map)
      })
      .catch(() => {
        if (!cancelled) setClientNames({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dbClientName =
    scope.mode === "client" ? clientNames[scope.clientId] : undefined

  const short =
    dbClientName?.trim() ?? getScopeShortLabel(scope)

  const line =
    scope.mode === "client" && dbClientName?.trim()
      ? `僅顯示與「${dbClientName.trim()}」相關的內容與指標。`
      : getScopeLine(scope)

  return (
    <div className="border-border/50 bg-muted/20 text-muted-foreground rounded-md border px-3 py-2 text-xs leading-snug">
      <span className="text-foreground/90 font-medium">範圍：{short}</span>
      <span className="text-border mx-2" aria-hidden>
        ·
      </span>
      <span>{line}</span>
    </div>
  )
}
