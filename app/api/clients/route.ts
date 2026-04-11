import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPermissionContext } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

/**
 * 可存取的客戶列表（RLS：與 client_memberships / admin 一致），供範圍選擇器與真實 content_items.client_id 對齊。
 */
export async function GET() {
  const ctx = await getPermissionContext()
  if (!ctx) {
    return NextResponse.json({ error: "未登入。" }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("clients")
    .select("id,name")
    .order("name", { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: `讀取客戶失敗：${error.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ clients: data ?? [] })
}
