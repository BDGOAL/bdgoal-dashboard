import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export function getMissingSupabasePublicEnv(): string[] {
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  return missing
}

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    const missing = getMissingSupabasePublicEnv()
    throw new Error(`缺少 Supabase 環境變數：${missing.join(", ")}`)
  }
  return { url, anon }
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { url, anon } = getEnv()

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        )
      },
    },
  })
}

export async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) return null
  return user
}

