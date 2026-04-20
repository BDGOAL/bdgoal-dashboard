import { NextResponse } from "next/server"

import { canEditClient, getPermissionContext } from "@/lib/auth/roles"
import { deleteManualContentItem } from "@/lib/content/store"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string }> }

/**
 * 刪除手動建立的內容列與其 `content_attachments` 列。
 *
 * **TODO（Storage）：** 未刪除 Supabase Storage 上的物件檔；若需節省空間，請依 `content_attachments.url`
 * 解析 object path 後呼叫 `storage.remove`，或排程清理孤兒物件。
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) {
      return NextResponse.json(
        { error: "未登入。", code: "UNAUTHORIZED", step: "auth" },
        { status: 401 },
      )
    }
    if (ctx.appRole === "viewer") {
      return NextResponse.json(
        { error: "你沒有編輯權限。", code: "FORBIDDEN", step: "auth_role" },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json(
        { error: "缺少內容 id。", code: "BAD_REQUEST", step: "validate" },
        { status: 400 },
      )
    }

    const sb = await createSupabaseServerClient()
    const { data: row, error: rowErr } = await sb
      .from("content_items")
      .select("id, client_id, source")
      .eq("id", id)
      .maybeSingle()

    if (rowErr || !row) {
      return NextResponse.json(
        { error: "找不到內容項目。", code: "NOT_FOUND", step: "load_item" },
        { status: 404 },
      )
    }
    if (row.source !== "manual") {
      return NextResponse.json(
        {
          error: "僅能刪除手動建立的內容。",
          code: "NOT_MANUAL",
          step: "validate_source",
        },
        { status: 403 },
      )
    }
    if (!canEditClient(ctx, row.client_id)) {
      return NextResponse.json(
        { error: "你沒有權限刪除此內容。", code: "FORBIDDEN", step: "permission" },
        { status: 403 },
      )
    }

    await deleteManualContentItem(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "刪除失敗。"
    const status =
      message === "找不到內容項目。" ? 404 : message.includes("僅能刪除") ? 403 : 500
    console.error("[content/items/id] DELETE:", message)
    return NextResponse.json(
      {
        error: message,
        code: status === 500 ? "DELETE_FAILED" : "CLIENT_ERROR",
        step: "delete",
      },
      { status },
    )
  }
}
