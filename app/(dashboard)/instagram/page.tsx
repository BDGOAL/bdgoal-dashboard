import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardContentItems } from "@/lib/content/store"
import type { ContentItem } from "@/lib/types/dashboard"

const InstagramManager = dynamic(
  () =>
    import("@/components/instagram/instagram-manager").then((m) => ({
      default: m.InstagramManager,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    ),
  },
)

export default async function InstagramPage() {
  let items: ContentItem[] = []
  let loadWarning: string | null = null
  try {
    items = await getDashboardContentItems()
  } catch (e) {
    console.error("[instagram/page] getDashboardContentItems:", e)
    loadWarning = "無法載入內容清單，請重新整理或稍後再試。"
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      {loadWarning ? (
        <p className="text-destructive mb-3 text-sm" role="alert">
          {loadWarning}
        </p>
      ) : null}
      <InstagramManager items={items} />
    </div>
  )
}
