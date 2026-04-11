import type { DashboardNavItem } from "@/lib/types/dashboard"

/** Primary sidebar routes (static config; not sample data). */
export const dashboardNavItems: DashboardNavItem[] = [
  { id: "overview", title: "總覽", href: "/" },
  { id: "ready-queue", title: "Ready Queue", href: "/ready-queue" },
  { id: "instagram", title: "Instagram", href: "/instagram" },
  { id: "analytics", title: "分析", href: "/analytics" },
  { id: "calendar", title: "行事曆", href: "/calendar" },
  { id: "competitors", title: "競品", href: "/competitors" },
  { id: "news", title: "新聞", href: "/news" },
]
