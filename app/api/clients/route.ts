import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role"
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
 * 建立新客戶：先以 {@link getPermissionContext} 驗證 admin／editor，
 * 再以 **service role** 寫入（繞過 RLS，避免 `current_app_role()`／政策與 session 不一致導致失敗）。
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

    let admin: ReturnType<typeof createSupabaseServiceRoleClient>
    try {
      admin = createSupabaseServiceRoleClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error("[api/clients POST] service client:", msg)
      return NextResponse.json(
        {
          error:
            "伺服器未正確設定 SUPABASE_SERVICE_ROLE_KEY，無法建立客戶。請聯絡管理員。",
        },
        { status: 503 },
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

    const id = crypto.randomUUID()

    const { error: insClient } = await admin.from("clients").insert({
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

    const { error: insMem } = await admin.from("client_memberships").insert({
      user_id: ctx.userId,
      client_id: id,
      role: "admin",
    })

    if (insMem) {
      console.error("[api/clients POST] membership:", insMem.message)
      const { error: delErr } = await admin.from("clients").delete().eq("id", id)
      if (delErr) {
        console.error("[api/clients POST] rollback client delete:", delErr.message)
        return NextResponse.json(
          {
            error: `無法建立你的成員資格，且無法自動還原客戶列（id: ${id}）。請聯絡管理員處理：${insMem.message}`,
          },
          { status: 500 },
        )
      }
      return NextResponse.json(
        {
          error: `無法將你加入此客戶：${insMem.message}。已取消建立，請稍後再試或聯絡管理員。`,
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
