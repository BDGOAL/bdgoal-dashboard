import { NextResponse } from "next/server"

import { getPermissionContext } from "@/lib/auth/roles"
import {
  createPreviewLink,
  findActiveInstagramPreviewLink,
  revokeActiveInstagramPreviewLinks,
  revokePreviewLink,
} from "@/lib/repositories/preview-repository"

type CreatePayload = {
  clientId?: string
  monthKey?: string
  viewType?: "grid" | "calendar"
  expiresAt?: string
  mode?: "instagram_latest"
  regenerate?: boolean
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
  if (body.mode === "instagram_latest") {
    if (!body.clientId) {
      return NextResponse.json({ error: "缺少 clientId。" }, { status: 400 })
    }
    if (!body.regenerate) {
      const existing = await findActiveInstagramPreviewLink(body.clientId)
      if (existing) {
        return NextResponse.json({ ok: true, row: existing, reused: true })
      }
    }
    await revokeActiveInstagramPreviewLinks(body.clientId)
    const expiresAt = body.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
    const monthKey = new Date().toISOString().slice(0, 7)
    const row = await createPreviewLink({
      clientId: body.clientId,
      monthKey,
      viewType: "grid",
      expiresAt,
      createdBy: ctx.userId,
    })
    return NextResponse.json({ ok: true, row, reused: false })
  }
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

export async function GET(req: Request) {
  const ctx = await getPermissionContext()
  if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
  const { createSupabaseServerClient } = await import("@/lib/supabase/server")
  const supabase = await createSupabaseServerClient()
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")
  const mode = searchParams.get("mode")
  const nowIso = new Date().toISOString()
  let query = supabase.from("preview_links").select("*").order("created_at", { ascending: false }).limit(30)
  if (mode === "instagram_latest") {
    query = query.eq("view_type", "grid").is("revoked_at", null).or(`expires_at.is.null,expires_at.gt.${nowIso}`)
  }
  if (clientId) {
    query = query.eq("client_id", clientId)
  }
  const { data, error } = await query
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

