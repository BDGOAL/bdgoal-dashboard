import dynamic from "next/dynamic"

import { PageIntro } from "@/components/dashboard/page-intro"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardContentItems } from "@/lib/content/store"
import type { ContentItem } from "@/lib/types/dashboard"

const AnalyticsDashboard = dynamic<{ items: ContentItem[] }>(
  () =>
    import("@/components/analytics/analytics-dashboard").then((m) => ({
      default: m.AnalyticsDashboard,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    ),
  },
)

export default async function AnalyticsPage() {
  const items = await getDashboardContentItems()
  return (
    <div className="space-y-6">
      <PageIntro
        title={"\u5167\u5bb9\u5206\u6790"}
        description={
          "\u4e0a\u65b9\u70ba\u5167\u5bb9\u7ba1\u7dda\u7d71\u8a08\uff08\u4f86\u81ea Dashboard \u771f\u5be6\u8cc7\u6599\uff09\uff1b\u4e0b\u65b9\u300c\u6f14\u793a\u300d\u5340\u584a\u70ba mock \u793e\u7fa4\u6210\u6548\uff0c\u4f9b\u7248\u9762\u8207\u5716\u8868\u7d50\u69cb\uff0c\u975e\u73fe\u5834\u89f8\u9054\u6216\u8ffd\u8e64\u6578\u3002"
        }
      />
      <AnalyticsDashboard items={items} />
    </div>
  )
}
