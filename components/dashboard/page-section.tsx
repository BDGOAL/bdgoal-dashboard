import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type PageSectionProps = {
  title: string
  description?: string
  className?: string
  children: ReactNode
}

/**
 * Consistent section stack for dashboard pages (h2 + optional muted description).
 */
export function PageSection({
  title,
  description,
  className,
  children,
}: PageSectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="space-y-0.5">
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
