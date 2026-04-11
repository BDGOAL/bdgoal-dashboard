import dynamic from "next/dynamic"

import { PageIntro } from "@/components/dashboard/page-intro"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardContentItems } from "@/lib/content/store"

const CalendarPageClient = dynamic(
  () =>
    import("@/components/calendar/calendar-page-client").then((m) => ({
      default: m.CalendarPageClient,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-[22rem] w-full rounded-lg" />
      </div>
    ),
  },
)

export default async function CalendarPage() {
  const items = await getDashboardContentItems()
  return (
    <div className="space-y-6">
      <PageIntro
        title="\u5167\u5bb9\u884c\u4e8b\u66c6"
        description="\u6392\u7a0b\u8207\u767c\u4f48\u6642\u9593\uff1b\u53ef\u5148\u7e2e\u5c0f\u9802\u7aef\u300c\u7bc4\u570d\u300d\uff0c\u518d\u7528\u5e73\u53f0\uff0f\u4e8b\u4ef6\u985e\u578b\u7be9\u9078\u3002"
      />
      <CalendarPageClient items={items} />
    </div>
  )
}
