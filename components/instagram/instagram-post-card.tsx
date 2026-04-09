import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ContentItem } from "@/lib/types/dashboard"
import { getContentDisplayDate } from "@/lib/instagram/content-helpers"
import {
  contentPostTypeLabel,
  contentStatusLabel,
} from "@/lib/instagram/labels"

function captionPreview(caption: string, max = 72) {
  const t = caption.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function InstagramPostCard({
  item,
  onEdit,
}: {
  item: ContentItem
  onEdit?: (item: ContentItem) => void
}) {
  const dateLabel =
    item.status === "scheduled"
      ? "排程"
      : item.status === "published"
        ? "發佈"
        : "更新"

  return (
    <article className="border-border/60 bg-background/40 hover:bg-muted/25 rounded-md border px-2 py-1.5 transition-colors">
      <div className="flex gap-2">
        <div className="bg-muted/80 relative size-10 shrink-0 overflow-hidden rounded border border-border/40">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- external mock URLs
            <img
              src={item.thumbnail}
              alt=""
              width={40}
              height={40}
              className="size-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground/80 flex size-full items-center justify-center text-[9px]">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h4 className="text-foreground line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug font-medium">
              {item.title}
            </h4>
            <div className="flex shrink-0 items-center gap-1">
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] font-medium"
              >
                {item.source === "asana"
                  ? "Asana"
                  : item.source === "manual"
                    ? "Manual"
                    : "Mock"}
              </Badge>
              <Badge
                variant="outline"
                className="text-muted-foreground border-border/60 px-1.5 py-0 text-[10px] font-normal"
              >
                {contentStatusLabel[item.status]}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground/90 mt-0.5 line-clamp-1 text-[11px] leading-tight">
            {captionPreview(item.caption) || "（無文案）"}
          </p>
          <div className="text-muted-foreground/70 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
            {item.clientName ? <span>{item.clientName}</span> : null}
            {item.clientName ? (
              <span className="text-border" aria-hidden>
                ·
              </span>
            ) : null}
            <span>{contentPostTypeLabel[item.postType]}</span>
            {item.position ? (
              <>
                <span className="text-border" aria-hidden>
                  ·
                </span>
                <span>Position: {item.position}</span>
              </>
            ) : null}
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span>
              {dateLabel} {getContentDisplayDate(item)}
            </span>
          </div>
          {item.tags.length > 0 ? (
            <div className="text-muted-foreground/60 mt-1 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span key={tag} className="text-[10px]">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {onEdit ? (
            <div className="mt-1.5">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => onEdit(item)}
              >
                編輯
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
