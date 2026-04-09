import { Card } from "@/components/ui/card"
import type { ContentStatus } from "@/lib/types/dashboard"
import { contentStatusLabel } from "@/lib/instagram/labels"

const summaryOrder: ContentStatus[] = [
  "idea",
  "draft",
  "scheduled",
  "published",
]

export function InstagramSummaryRow({
  counts,
}: {
  counts: Record<ContentStatus, number>
}) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {summaryOrder.map((status) => (
        <Card
          key={status}
          size="sm"
          className="ring-border/40 flex flex-row items-center justify-between gap-2 py-2.5 shadow-none"
        >
          <span className="text-muted-foreground text-xs font-medium">
            {contentStatusLabel[status]}
          </span>
          <span className="text-foreground text-xl font-semibold tabular-nums">
            {counts[status]}
          </span>
        </Card>
      ))}
    </div>
  )
}
