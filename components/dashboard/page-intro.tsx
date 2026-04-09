"use client"

import { ActiveScopeHint } from "@/components/dashboard/active-scope-hint"
import { PageHeader } from "@/components/dashboard/page-header"

type PageIntroProps = {
  title: string
  description?: string
  /** Set false for pages where scope is less central (optional). */
  showScopeHint?: boolean
}

export function PageIntro({
  title,
  description,
  showScopeHint = true,
}: PageIntroProps) {
  return (
    <div className="space-y-3">
      <PageHeader title={title} description={description} />
      {showScopeHint ? <ActiveScopeHint /> : null}
    </div>
  )
}
