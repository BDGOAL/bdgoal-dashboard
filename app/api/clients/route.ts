import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPermissionContext } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

function suggestSlugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  return base.length ? base.slice(0, 64) : `client-${crypto.randomUUID().slice(0, 8)}`
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type CreateClientBody = {
  name?: string
  slug?: string
  /** 预留；`clients` 表目前無 notes 欄位，此值會被忽略。 */
  notes?: string
}

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

/**
 * 建立新客戶（admin／editor，與 RLS `clients_insert_by_editor_or_admin` 一致），
 * 並為目前使用者建立第一筆 client_memberships（admin）。
 */
export async function POST(req: Request) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) {
      return NextResponse.json({ error: "未登入。" }, { status: 401 })
    }
    if (ctx.appRole !== "admin" && ctx.appRole !== "editor") {
      return NextResponse.json(
        { error: "僅管理員或編輯可建立新客戶。" },
        { status: 403 },
      )
    }

    const body = (await req.json()) as CreateClientBody
    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: "客戶名稱為必填。" }, { status: 400 })
    }

    const slugRaw = body.slug?.trim().toLowerCase()
    const slug = slugRaw && slugRaw.length > 0 ? slugRaw : suggestSlugFromName(name)
    if (!SLUG_RE.test(slug) || slug.length > 64) {
      return NextResponse.json(
        { error: "slug 須為小寫英數與連字號，且不可為空。" },
        { status: 400 },
      )
    }

    void body.notes

    const supabase = await createSupabaseServerClient()
    const id = crypto.randomUUID()

    const { error: insClient } = await supabase.from("clients").insert({
      id,
      name,
      slug,
      status: "active",
    })

    if (insClient) {
      if (insClient.code === "23505") {
        return NextResponse.json(
          { error: "此 slug 已被使用，請換一個。" },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: `建立客戶失敗：${insClient.message}` },
        { status: 500 },
      )
    }

    const { error: insMem } = await supabase.from("client_memberships").insert({
      user_id: ctx.userId,
      client_id: id,
      role: "admin",
    })

    if (insMem) {
      console.error("[api/clients POST] membership:", insMem.message)
      return NextResponse.json(
        {
          error: `客戶已建立，但無法加入你的成員資格：${insMem.message}。請由管理員手動加入 client_memberships。`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      client: { id, name, slug },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "建立客戶失敗。"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
