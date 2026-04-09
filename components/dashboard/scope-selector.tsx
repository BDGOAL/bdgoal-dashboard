"use client"

import * as React from "react"

import { mockBrands, mockClients, mockSocialAccounts } from "@/lib/mock/agency"
import { contentPlatformLabel } from "@/lib/calendar/labels"
import { parseScope, serializeScope } from "@/lib/scope/serialize"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { cn } from "@/lib/utils"

const selectClass = cn(
  "border-input bg-background dark:bg-input/30 h-8 max-w-[min(100%,280px)] min-w-0 flex-1 rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

export function ScopeSelector() {
  const { scope, setScope } = useWorkspaceScope()
  const value = serializeScope(scope)

  return (
    <label className="flex min-w-0 max-w-full flex-1 items-center gap-2 sm:max-w-[min(100%,300px)]">
      <span className="text-muted-foreground hidden shrink-0 text-[11px] sm:inline">
        範圍
      </span>
      <select
        className={selectClass}
        value={value}
        onChange={(e) => setScope(parseScope(e.target.value))}
        aria-label="工作區範圍"
      >
        <option value="all">全部客戶</option>
        <optgroup label="客戶">
          {mockClients.map((c) => (
            <option key={c.id} value={serializeScope({ mode: "client", clientId: c.id })}>
              {c.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="品牌">
          {mockBrands.map((b) => {
            const client = mockClients.find((c) => c.id === b.clientId)
            return (
              <option key={b.id} value={serializeScope({ mode: "brand", brandId: b.id })}>
                {client?.name ?? ""} · {b.name}
              </option>
            )
          })}
        </optgroup>
        <optgroup label="社群帳號">
          {mockSocialAccounts.map((a) => (
            <option
              key={a.id}
              value={serializeScope({ mode: "account", accountId: a.id })}
            >
              {a.handle} · {contentPlatformLabel[a.platform]}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}
