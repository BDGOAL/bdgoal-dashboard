import dynamic from "next/dynamic"

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
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    ),
  },
)

export default async function InstagramPage() {
  const items = await getDashboardContentItems()
  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <InstagramManager items={items} />
    </div>
  )
}
