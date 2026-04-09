import type { ContentItem, ContentStatus } from "@/lib/types/dashboard"
import { EmptyState } from "@/components/dashboard/empty-state"
import { InstagramPostCard } from "@/components/instagram/instagram-post-card"
import { Badge } from "@/components/ui/badge"

const EMPTY_BY_STATUS: Record<
  ContentStatus,
  { title: string; reason: string; suggestion: string }
> = {
  idea: {
    title: "此欄尚無靈感／待辦",
    reason:
      "目前工作區範圍內沒有留在「靈感」階段的 Instagram 素材，或已轉成草稿。",
    suggestion: "使用「新增貼文」建立靈感，或將頂端範圍改為「全部客戶」以檢視其他帳號。",
  },
  draft: {
    title: "此欄尚無草稿",
    reason: "範圍內沒有撰寫中的貼文，或草稿已排程／發佈。",
    suggestion: "從靈感欄拖移或新增貼文，並將狀態設為草稿以在此追蹤。",
  },
  scheduled: {
    title: "此欄尚無排程",
    reason: "目前沒有已設定排程時間的貼文；可能仍為草稿或尚未排程。",
    suggestion: "確認草稿已設定排程時間，或放寬頂端客戶／品牌範圍。",
  },
  published: {
    title: "此欄尚無已發佈內容",
    reason: "此範圍內尚無已上線貼文，或發佈紀錄不在示範資料中。",
    suggestion: "切換範圍至其他品牌／帳號，或將草稿完成並標記為已發佈。",
  },
}

export function InstagramStatusColumn({
  title,
  status,
  count,
  items,
  onEdit,
}: {
  title: string
  status: ContentStatus
  count: number
  items: ContentItem[]
  onEdit?: (item: ContentItem) => void
}) {
  return (
    <section className="border-border/50 bg-card/30 flex min-h-0 flex-col rounded-lg border">
      <header className="border-border/50 flex flex-wrap items-baseline justify-between gap-2 border-b px-2.5 py-2">
        <h3 className="text-foreground text-[13px] font-semibold tracking-tight">
          {title}
        </h3>
        <Badge
          variant="secondary"
          className="text-muted-foreground h-5 min-w-5 px-1.5 text-[10px] font-medium tabular-nums"
        >
          {count}
        </Badge>
      </header>
      <div className="flex flex-col gap-1.5 p-2">
        {items.length === 0 ? (
          <EmptyState
            className="border-border/40 bg-transparent px-2 py-4 text-[11px]"
            title={EMPTY_BY_STATUS[status].title}
            reason={EMPTY_BY_STATUS[status].reason}
            suggestion={EMPTY_BY_STATUS[status].suggestion}
          />
        ) : (
          items.map((item) => (
            <InstagramPostCard key={item.id} item={item} onEdit={onEdit} />
          ))
        )}
      </div>
    </section>
  )
}
