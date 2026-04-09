import { PageIntro } from "@/components/dashboard/page-intro"
import { CompetitorTracker } from "@/components/competitors/competitor-tracker"

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        title="競品追蹤"
        description="對手公開帳號的示範指標；列表隨頂端「範圍」在客戶／品牌間切換。"
      />
      <CompetitorTracker />
    </div>
  )
}
