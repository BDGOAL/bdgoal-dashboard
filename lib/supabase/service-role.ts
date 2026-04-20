import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Supabase client with the **service role** key. Bypasses RLS.
 * Use only in Server Actions / Route Handlers after explicit permission checks.
 * Never import from client components or expose `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（僅限伺服器端）。",
    )
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
