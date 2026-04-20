import type { ContentItem } from "@/lib/types/dashboard"

/** Stored in `localNotes` for manual items that should show as「待審核」— no schema change. */
export const INSTAGRAM_NEEDS_APPROVAL_LOCAL_MARKER = "bdgoal:needs-approval"

/** User-facing pipeline labels for Instagram planner UI */
export type InstagramDisplayStatus =
  | "draft"
  | "needsApproval"
  | "scheduled"
  | "published"

export function getInstagramDisplayStatus(item: ContentItem): InstagramDisplayStatus {
  if (item.status === "published") return "published"
  if (item.status === "scheduled") return "scheduled"
  if (item.status === "idea") return "needsApproval"
  if (
    item.localNotes?.includes(INSTAGRAM_NEEDS_APPROVAL_LOCAL_MARKER) &&
    item.status === "draft"
  ) {
    return "needsApproval"
  }
  return "draft"
}

export const instagramDisplayStatusLabel: Record<InstagramDisplayStatus, string> = {
  draft: "草稿",
  needsApproval: "待審核",
  scheduled: "已排程",
  published: "已發佈",
}

export function instagramDisplayStatusBadgeClass(
  status: InstagramDisplayStatus,
): string {
  switch (status) {
    case "published":
      return "border-emerald-500/45 bg-emerald-500/15 text-emerald-50"
    case "scheduled":
      return "border-border/60 bg-muted/90 text-foreground"
    case "needsApproval":
      return "border-amber-500/45 bg-amber-500/20 text-amber-50"
    case "draft":
    default:
      return "border-border/50 bg-secondary/80 text-secondary-foreground"
  }
}
