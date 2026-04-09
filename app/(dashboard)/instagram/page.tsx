import { PageIntro } from "@/components/dashboard/page-intro"
import { AsanaReadyQueue } from "@/components/dashboard/asana-ready-queue"
import { InstagramManager } from "@/components/instagram/instagram-manager"
import { getDashboardContentItems } from "@/lib/content/store"

export default async function InstagramPage() {
  const items = await getDashboardContentItems()
  return (
    <div className="space-y-6">
      <PageIntro
        title="Instagram"
        description="BDGoal 的排程流程以 Asana Ready Queue 為主來源；下方仍可用既有欄位檢視與手動補充。"
      />
      <AsanaReadyQueue />
      <InstagramManager items={items} />
    </div>
  )
}
