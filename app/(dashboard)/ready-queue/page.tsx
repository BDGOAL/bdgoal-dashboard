import { AsanaReadyQueue } from "@/components/dashboard/asana-ready-queue"
import { PageIntro } from "@/components/dashboard/page-intro"
import { PreviewLinkManager } from "@/components/dashboard/preview-link-manager"

export default function ReadyQueuePage() {
  return (
    <div className="space-y-6">
      <PageIntro
        title="Asana Ready Queue"
        description="BDGoal 與 Asana 同步前的待匯入清單；僅顯示符合 Ready-to-sync 條件的主任務。"
      />
      <PreviewLinkManager />
      <AsanaReadyQueue />
    </div>
  )
}
