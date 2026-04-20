"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Calendar,
  Camera,
  Inbox,
  LayoutDashboard,
  MoreHorizontal,
  Newspaper,
  Users,
} from "lucide-react"

import { dashboardNavItems } from "@/lib/navigation/dashboard-nav"
import { useShowInstagramPlanner } from "@/lib/preferences/show-instagram-planner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const iconMap = {
  overview: LayoutDashboard,
  "ready-queue": Inbox,
  instagram: Camera,
  analytics: BarChart3,
  calendar: Calendar,
  competitors: Users,
  news: Newspaper,
} as const

function NavIcon({ id }: { id: string }) {
  const Icon =
    iconMap[id as keyof typeof iconMap] ?? LayoutDashboard
  return <Icon />
}

export function AppSidebar() {
  const pathname = usePathname()
  const [showInstagramPlanner, setShowInstagramPlanner] = useShowInstagramPlanner()
  const [navMenuOpen, setNavMenuOpen] = React.useState(false)

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-sidebar-border/80 border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-lg text-xs font-bold">
            BD
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">BDGoal Dashboard</span>
            <span className="text-sidebar-foreground/70 truncate text-xs">
              Agency Workflow
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>導覽</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardNavItems.map((item) => {
                if (item.id === "instagram" && !showInstagramPlanner) return null
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      render={<Link href={item.href} />}
                    >
                      <NavIcon id={item.id} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border/80 border-t p-2">
        <div className="px-1">
          <button
            type="button"
            className="text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-expanded={navMenuOpen}
            onClick={() => setNavMenuOpen((o) => !o)}
          >
            <MoreHorizontal className="size-4 shrink-0 opacity-90" aria-hidden />
            <span className="group-data-[collapsible=icon]:hidden">選單</span>
          </button>
          {navMenuOpen ? (
            <div className="border-sidebar-border bg-sidebar text-sidebar-foreground mt-1 space-y-2 rounded-md border p-2 shadow-sm">
              <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
                <input
                  type="checkbox"
                  checked={showInstagramPlanner}
                  onChange={(e) => setShowInstagramPlanner(e.target.checked)}
                  className="border-input bg-background mt-0.5 size-3.5 shrink-0 rounded"
                />
                <span>顯示 Instagram 規劃</span>
              </label>
            </div>
          ) : null}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
