import { cn } from "@/lib/utils"

export type FilterChipItem = {
  label: string
  /** Highlight as the active constraint */
  active?: boolean
}

export function FilterActiveChips({
  items,
  className,
}: {
  items: FilterChipItem[]
  className?: string
}) {
  if (items.length === 0) return null
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px]",
        className,
      )}
    >
      <span className="shrink-0">使用中：</span>
      {items.map((item) => (
        <span
          key={item.label}
          className={cn(
            "rounded-md border px-2 py-0.5",
            item.active
              ? "border-primary/45 bg-primary/10 text-foreground"
              : "border-border/50 bg-background/80",
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}
