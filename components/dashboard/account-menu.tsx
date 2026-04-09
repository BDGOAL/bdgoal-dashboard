"use client"

import * as React from "react"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function AccountMenu() {
  const [email, setEmail] = React.useState<string | null>(null)
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])
  if (!email) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground hidden text-xs sm:inline">
        {email}
      </span>
      <form action="/auth/logout" method="post">
        <Button type="submit" size="sm" variant="outline">
          登出
        </Button>
      </form>
    </div>
  )
}

