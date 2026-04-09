import { PageIntro } from "@/components/dashboard/page-intro"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        title="內容分析"
        description="曝光、互動與追蹤趨勢；數字依頂端「範圍」與下方期間加總或重算（示範資料）。"
      />
      <AnalyticsDashboard />
    </div>
  )
}
