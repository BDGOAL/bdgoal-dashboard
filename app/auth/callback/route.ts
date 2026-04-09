import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") || "/"

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id && user.email) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
      })
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}

