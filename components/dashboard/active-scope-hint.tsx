"use client"

import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { getScopeLine, getScopeShortLabel } from "@/lib/scope/scope-label"

export function ActiveScopeHint() {
  const { scope } = useWorkspaceScope()
  const short = getScopeShortLabel(scope)

  return (
    <div className="border-border/50 bg-muted/20 text-muted-foreground rounded-md border px-3 py-2 text-xs leading-snug">
      <span className="text-foreground/90 font-medium">範圍：{short}</span>
      <span className="text-border mx-2" aria-hidden>
        ·
      </span>
      <span>{getScopeLine(scope)}</span>
    </div>
  )
}
