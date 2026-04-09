import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  /** Why this view is empty (scope, filters, or genuinely no data). */
  reason: string
  /** What to try next. */
  suggestion: string
  className?: string
}

/**
 * Shared empty / no-results pattern — dark CMS style, not decorative.
 */
export function EmptyState({
  title,
  reason,
  suggestion,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "border-border/60 bg-muted/15 text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm",
        className,
      )}
    >
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="mt-2 text-xs leading-relaxed">{reason}</p>
      <p className="mt-3 text-xs leading-relaxed">{suggestion}</p>
    </div>
  )
}
