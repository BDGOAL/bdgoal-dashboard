import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  /** Why this view is empty (scope, filters, or genuinely no data). */
  reason: string
  /** What to try next. */
  suggestion: string
  className?: string
  /** Optional icon for visual consistency across pages. */
  icon?: LucideIcon
}

/**
 * Shared empty / no-results pattern — dark CMS style, not decorative.
 */
export function EmptyState({
  title,
  reason,
  suggestion,
  className,
  icon: Icon,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "border-border/60 bg-muted/15 text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className="text-muted-foreground/70 mx-auto mb-3 size-8 stroke-[1.25]"
          aria-hidden
        />
      ) : null}
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="mt-2 text-xs leading-relaxed">{reason}</p>
      <p className="mt-3 text-xs leading-relaxed">{suggestion}</p>
    </div>
  )
}
