import { NextResponse } from "next/server"

import { getPermissionContext } from "@/lib/auth/roles"
import { createPreviewLink, revokePreviewLink } from "@/lib/repositories/preview-repository"

type CreatePayload = {
  clientId?: string
  monthKey?: string
  viewType?: "grid" | "calendar"
  expiresAt?: string
}

type RevokePayload = {
  id?: string
}

export async function POST(req: Request) {
  const ctx = await getPermissionContext()
  if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
  if (ctx.appRole === "viewer") {
    return NextResponse.json({ error: "你沒有建立預覽連結權限。" }, { status: 403 })
  }

  const body = (await req.json()) as CreatePayload
  if (!body.clientId || !body.monthKey || !body.viewType || !body.expiresAt) {
    return NextResponse.json({ error: "缺少必要欄位。" }, { status: 400 })
  }
  const row = await createPreviewLink({
    clientId: body.clientId,
    monthKey: body.monthKey,
    viewType: body.viewType,
    expiresAt: body.expiresAt,
    createdBy: ctx.userId,
  })
  return NextResponse.json({ ok: true, row })
}

export async function GET() {
  const ctx = await getPermissionContext()
  if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
  const { createSupabaseServerClient } = await import("@/lib/supabase/server")
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("preview_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}

export async function PATCH(req: Request) {
  const ctx = await getPermissionContext()
  if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
  if (ctx.appRole === "viewer") {
    return NextResponse.json({ error: "你沒有撤銷預覽連結權限。" }, { status: 403 })
  }
  const body = (await req.json()) as RevokePayload
  if (!body.id) {
    return NextResponse.json({ error: "缺少連結 id。" }, { status: 400 })
  }
  await revokePreviewLink(body.id)
  return NextResponse.json({ ok: true })
}

