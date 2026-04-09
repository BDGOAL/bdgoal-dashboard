import { PageIntro } from "@/components/dashboard/page-intro"
import { ContentCalendar } from "@/components/calendar/content-calendar"
import { getDashboardContentItems } from "@/lib/content/store"

export default async function CalendarPage() {
  const items = await getDashboardContentItems()
  return (
    <div className="space-y-6">
      <PageIntro
        title="內容行事曆"
        description="排程與發佈時間；可先縮小頂端「範圍」，再用平台／事件類型篩選。"
      />
      <ContentCalendar items={items} />
    </div>
  )
}
