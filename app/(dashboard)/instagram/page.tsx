import dynamic from "next/dynamic"

import { AsanaReadyQueue } from "@/components/dashboard/asana-ready-queue"
import { PageIntro } from "@/components/dashboard/page-intro"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardContentItems } from "@/lib/content/store"

const InstagramManager = dynamic(
  () =>
    import("@/components/instagram/instagram-manager").then((m) => ({
      default: m.InstagramManager,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    ),
  },
)

export default async function InstagramPage() {
  const items = await getDashboardContentItems()
  return (
    <div className="space-y-6">
      <PageIntro
        title="Instagram"
        description="BDGoal \u7684\u6392\u7a0b\u6d41\u7a0b\u4ee5 Asana Ready Queue \u70ba\u4e3b\u4f86\u6e90\uff1b\u4e0b\u65b9\u4ecd\u53ef\u7528\u65e2\u6709\u6b0a\u4f4d\u6aa2\u8996\u8207\u624b\u52d5\u88dc\u5145\u3002"
      />
      <AsanaReadyQueue />
      <InstagramManager items={items} />
    </div>
  )
}
