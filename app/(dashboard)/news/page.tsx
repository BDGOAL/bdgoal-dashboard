import { PageIntro } from "@/components/dashboard/page-intro"
import { IndustryWatchlist } from "@/components/news/industry-watchlist"

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        title="產業雷達"
        description="平台、工具與市場信號；先對齊頂端「範圍」，再用主題／優先／信號篩選。"
      />
      <IndustryWatchlist />
    </div>
  )
}
