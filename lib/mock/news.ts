import type { NewsItem } from "@/lib/types/news"

/**
 * Mock RSS-style industry signals — not live feeds.
 */
export const mockNewsItems: NewsItem[] = [
  {
    id: "nw-1",
    title: "Meta 廣告管理員推出新版素材實驗報表",
    source: "Meta Business 部落格",
    publishDate: "2026-04-09T02:00:00.000Z",
    summary:
      "可並列比對多組素材在轉換與停留上的差異，並支援匯出 CSV。",
    topic: "tools",
    relevanceLevel: "high",
    followUpPriority: "high",
    whyItMatters:
      "Aurora 本季主打轉換活動，需確認是否影響目前 A/B 命名與報表欄位。",
    clientIds: ["cl-aurora"],
    brandIds: ["br-aurora-main"],
    signalType: "platform-update",
    url: "https://example.com/meta/ads-experiments",
  },
  {
    id: "nw-2",
    title: "短影音完播率與首 3 秒留存白皮書（2026 Q1）",
    source: "社群行銷公會",
    publishDate: "2026-04-08T09:30:00.000Z",
    summary:
      "彙整 12 個產業的 Reels／Shorts 表現，附產業對照表。",
    topic: "research",
    relevanceLevel: "high",
    followUpPriority: "medium",
    whyItMatters:
      "可作為茶飲副牌下季內容節奏與封面測試的對照基準。",
    clientIds: ["cl-aurora"],
    brandIds: ["br-aurora-tea"],
    signalType: "research-signal",
    url: "https://example.com/research/short-video-2026q1",
  },
  {
    id: "nw-3",
    title: "零售通路清明連假檔期人流預測上修",
    source: "商業周刊",
    publishDate: "2026-04-07T22:15:00.000Z",
    summary:
      "北北基超市與量販週末人流預估較去年同期 +6%。",
    topic: "business",
    relevanceLevel: "medium",
    followUpPriority: "medium",
    whyItMatters:
      "主品牌線下促銷素材與限動導流時段可微調。",
    clientIds: ["cl-aurora"],
    brandIds: [],
    signalType: "market-news",
    url: "https://example.com/news/retail-footfall",
  },
  {
    id: "nw-4",
    title: "Canva 企業版批次替換品牌字體與色票",
    source: "Canva 更新日誌",
    publishDate: "2026-04-07T06:00:00.000Z",
    summary:
      "支援依資料夾套用設計系統，降低跨帳號誤用。",
    topic: "tools",
    relevanceLevel: "medium",
    followUpPriority: "low",
    whyItMatters:
      "可降低多編輯協作時的版控成本；與現有設計規範對齊即可。",
    clientIds: [],
    brandIds: ["br-aurora-main"],
    signalType: "tool-update",
    url: "https://example.com/canva/bulk-brand",
  },
  {
    id: "nw-5",
    title: "Google Analytics 4 自訂維度上限調整公告",
    source: "Google Analytics 說明中心",
    publishDate: "2026-04-06T14:00:00.000Z",
    summary:
      "部分資源將在 5 月起調整自訂維度配額，需檢視事件設計。",
    topic: "tools",
    relevanceLevel: "high",
    followUpPriority: "high",
    whyItMatters:
      "Pulse 官網與活動頁事件眾多，需盤點是否逼近上限並收斂命名。",
    clientIds: ["cl-pulse"],
    brandIds: ["br-pulse-core"],
    signalType: "platform-update",
    url: "https://example.com/ga4/custom-dimensions",
  },
  {
    id: "nw-6",
    title: "穿戴裝置搜尋熱詞：睡眠與恢復類詞彙月增 18%",
    source: "SEO 觀察站",
    publishDate: "2026-04-06T08:40:00.000Z",
    summary:
      "以台灣繁中搜尋面板抽樣，僅供趨勢參考。",
    topic: "research",
    relevanceLevel: "medium",
    followUpPriority: "low",
    whyItMatters:
      "可檢視是否與量子穿戴近期文案主軸重疊，避免錯失搜尋意圖。",
    clientIds: ["cl-pulse"],
    brandIds: ["br-pulse-core"],
    signalType: "research-signal",
    url: "https://example.com/seo/wearable-queries",
  },
  {
    id: "nw-7",
    title: "主要 3C 通路週年慶檔期提前一週開跑",
    source: "科技脈動",
    publishDate: "2026-04-05T11:20:00.000Z",
    summary:
      "線上商城與門市同步，預估首週以配件與耳機類為主戰場。",
    topic: "business",
    relevanceLevel: "medium",
    followUpPriority: "medium",
    whyItMatters:
      "極速 3C 與直播剪輯檔期可能重疊，需協調預算與素材節奏。",
    clientIds: ["cl-pulse"],
    brandIds: [],
    signalType: "market-news",
    url: "https://example.com/news/retail-3c",
  },
  {
    id: "nw-8",
    title: "Threads API 公開測試名額擴大（含排程第三方）",
    source: "Threads @developers",
    publishDate: "2026-04-04T16:45:00.000Z",
    summary:
      "新增部分排程與草稿端點，仍有限流。",
    topic: "tools",
    relevanceLevel: "medium",
    followUpPriority: "medium",
    whyItMatters:
      "茶飲長文串更新密集，可評估是否導入排程降低人工作業。",
    clientIds: ["cl-aurora"],
    brandIds: ["br-aurora-tea"],
    signalType: "platform-update",
    url: "https://example.com/threads/api-beta",
  },
  {
    id: "nw-9",
    title: "食品業廣告用語合規抽查重點更新",
    source: "公平交易委員會新聞稿",
    publishDate: "2026-04-03T07:00:00.000Z",
    summary:
      "強調「天然」「無添加」等字樣需有依據，附常見裁罰態樣。",
    topic: "business",
    relevanceLevel: "high",
    followUpPriority: "high",
    whyItMatters:
      "Aurora 主品牌與茶飲促銷文案需快速自查一輪。",
    clientIds: ["cl-aurora"],
    brandIds: [],
    signalType: "market-news",
    url: "https://example.com/ftc/food-claims",
  },
  {
    id: "nw-10",
    title: "YouTube Shorts 新長度實驗（部分區域）",
    source: "YouTube Creator Insider",
    publishDate: "2026-04-02T12:00:00.000Z",
    summary:
      "部分創作者可上傳超過 60 秒但仍以 Shorts 形式分發。",
    topic: "tools",
    relevanceLevel: "low",
    followUpPriority: "low",
    whyItMatters:
      "若實驗擴大，Shorts 精華剪輯腳本長度可重新評估。",
    clientIds: ["cl-pulse"],
    brandIds: ["br-pulse-core"],
    signalType: "platform-update",
    url: "https://example.com/youtube/shorts-length",
  },
  {
    id: "nw-11",
    title: "社群聆聽：手搖飲「第二杯半價」負向情緒上升",
    source: "內部方法論摘要（mock）",
    publishDate: "2026-04-01T10:00:00.000Z",
    summary:
      "抽樣 2k 則公開貼文，情緒分類為示意。",
    topic: "research",
    relevanceLevel: "medium",
    followUpPriority: "medium",
    whyItMatters:
      "茶飲促銷文案可改強調「份量／配料透明」轉移價格敏感。",
    clientIds: ["cl-aurora"],
    brandIds: ["br-aurora-tea"],
    signalType: "research-signal",
    url: "https://example.com/research/bogo-sentiment",
  },
  {
    id: "nw-12",
    title: "TikTok 商業帳號分析頁改版（留存曲線）",
    source: "TikTok for Business",
    publishDate: "2026-03-30T08:00:00.000Z",
    summary:
      "新增以秒為單位的留存曲線與流失點標記。",
    topic: "tools",
    relevanceLevel: "medium",
    followUpPriority: "medium",
    whyItMatters:
      "跳動實驗室可對照既有梗圖影片找出前 3 秒流失原因。",
    clientIds: ["cl-pulse"],
    brandIds: ["br-pulse-core"],
    signalType: "platform-update",
    url: "https://example.com/tiktok/analytics-retention",
  },
  {
    id: "nw-agency-1",
    title: "本週代理商社群產業雷達（內部摘要）",
    source: "內部週報（mock）",
    publishDate: "2026-04-09T05:00:00.000Z",
    summary:
      "整理各客戶產業熱門議題與待追問事項，僅供內部對齊。",
    topic: "business",
    relevanceLevel: "medium",
    followUpPriority: "low",
    whyItMatters:
      "開週會前快速對齊「本週誰需要什麼」；不綁定單一客戶。",
    clientIds: [],
    brandIds: [],
    signalType: "market-news",
    url: "https://example.com/internal/weekly-radar",
  },
]
