"use client"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { CreateClientDialog } from "@/components/dashboard/create-client-dialog"
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
            <div className="ml-auto flex min-w-0 max-w-[min(100%,440px)] items-center justify-end gap-2">
              <CreateClientDialog />
              <ScopeSelector />
            </div>
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden p-4 sm:p-6">
            {children}
          </div>
        </SidebarInset>
      </WorkspaceScopeProvider>
    </SidebarProvider>
  )
}
