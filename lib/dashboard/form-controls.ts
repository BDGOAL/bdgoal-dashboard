import { cn } from "@/lib/utils"

/**
 * Shared form control styling utilities for dashboard (dark theme).
 */

/** Native `<select>` styling aligned with dashboard filter bars. */
export const dashboardSelectClassName = cn(
  "border-input bg-background dark:bg-input/30 h-8 rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)

/** Select with a sensible max width for dense filter rows. */
export const dashboardSelectNarrowClassName = cn(
  dashboardSelectClassName,
  "max-w-[min(100%,280px)]",
)

/** Text inputs in filter/toolbars. */
export const dashboardInputClassName = cn(
  "border-input bg-background dark:bg-input/30 h-8 rounded-md border px-2 text-xs shadow-none outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2",
)
