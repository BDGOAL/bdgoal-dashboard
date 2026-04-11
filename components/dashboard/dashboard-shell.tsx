"use client"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { ScopeSelector } from "@/components/dashboard/scope-selector"
import { WorkspaceScopeProvider } from "@/components/dashboard/workspace-scope-context"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <WorkspaceScopeProvider>
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-muted-foreground shrink-0 text-sm font-medium">
              BDGoal Dashboard
            </span>
            <AccountMenu />
            <div className="ml-auto min-w-0 max-w-[min(100%,300px)]">
              <ScopeSelector />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </WorkspaceScopeProvider>
    </SidebarProvider>
  )
}
