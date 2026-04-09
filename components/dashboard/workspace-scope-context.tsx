"use client"

import * as React from "react"

import type { WorkspaceScope } from "@/lib/types/agency"

const WorkspaceScopeContext = React.createContext<{
  scope: WorkspaceScope
  setScope: React.Dispatch<React.SetStateAction<WorkspaceScope>>
} | null>(null)

export function WorkspaceScopeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [scope, setScope] = React.useState<WorkspaceScope>({ mode: "all" })

  const value = React.useMemo(
    () => ({ scope, setScope }),
    [scope],
  )

  return (
    <WorkspaceScopeContext.Provider value={value}>
      {children}
    </WorkspaceScopeContext.Provider>
  )
}

export function useWorkspaceScope() {
  const ctx = React.useContext(WorkspaceScopeContext)
  if (!ctx) {
    throw new Error("useWorkspaceScope must be used within WorkspaceScopeProvider")
  }
  return ctx
}
