"use client"

import * as React from "react"

import { parseScope, serializeScope } from "@/lib/scope/serialize"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"

const selectClass = cn(
  "border-input bg-background dark:bg-input/30 h-8 max-w-[min(100%,280px)] min-w-0 flex-1 rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

type ApiClientRow = { id: string; name: string }

export function ScopeSelector() {
  const { scope, setScope } = useWorkspaceScope()
  const value = serializeScope(scope)

  const [apiClients, setApiClients] = React.useState<ApiClientRow[] | null>(null)
  const [loadFailed, setLoadFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    fetch("/api/clients", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { clients?: ApiClientRow[]; error?: string }
        if (!res.ok) {
          console.error("[ScopeSelector] GET /api/clients failed:", res.status, json.error)
          return []
        }
        return json.clients ?? []
      })
      .then((rows) => {
        if (!cancelled) {
          setApiClients(rows)
          setLoadFailed(false)
        }
      })
      .catch((e) => {
        console.error("[ScopeSelector] GET /api/clients error:", e)
        if (!cancelled) {
          setApiClients([])
          setLoadFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loading = apiClients === null
  const clientOptions = React.useMemo(() => apiClients ?? [], [apiClients])

  React.useEffect(() => {
    if (loading || !clientOptions.length) return
    setScope((prev) => {
      if (prev.mode === "brand" || prev.mode === "account") return { mode: "all" }
      if (
        prev.mode === "client" &&
        !clientOptions.some((c) => c.id === prev.clientId)
      ) {
        return { mode: "all" }
      }
      return prev
    })
  }, [clientOptions, loading, setScope])

  return (
    <label className="flex min-w-0 max-w-full flex-1 items-center gap-2 sm:max-w-[min(100%,300px)]">
      <span className="text-muted-foreground hidden shrink-0 text-[11px] sm:inline">
        範圍
      </span>
      <select
        className={selectClass}
        value={value}
        onChange={(e) => setScope(parseScope(e.target.value))}
        disabled={loading}
        aria-label="工作區範圍"
        aria-busy={loading}
      >
        <option value="all">全部客戶</option>
        <optgroup label="客戶">
          {clientOptions.map((c) => (
            <option key={c.id} value={serializeScope({ mode: "client", clientId: c.id })}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </select>
      {loadFailed ? (
        <span className="text-destructive sr-only">
          客戶列表載入失敗（已記錄於 console）
        </span>
      ) : null}
    </label>
  )
}
