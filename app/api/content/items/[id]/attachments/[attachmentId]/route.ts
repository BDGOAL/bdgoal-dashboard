import { NextResponse } from "next/server"

import { canEditClient, getPermissionContext } from "@/lib/auth/roles"
import { deleteContentAttachmentForItem } from "@/lib/content/store"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string; attachmentId: string }> }

/**
 * 刪除單一附件列並重設縮圖。**TODO：** 未刪除 Storage 檔案。
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

    const { id: itemId, attachmentId } = await params
    if (!itemId?.trim() || !attachmentId?.trim()) {
      return NextResponse.json(
        { error: "缺少 id。", code: "BAD_REQUEST", step: "validate" },
        { status: 400 },
      )
    }

    const sb = await createSupabaseServerClient()
    const { data: item, error: itemErr } = await sb
      .from("content_items")
      .select("id, client_id")
      .eq("id", itemId)
      .maybeSingle()

    if (itemErr || !item) {
      return NextResponse.json(
        { error: "找不到內容項目。", code: "NOT_FOUND", step: "load_item" },
        { status: 404 },
      )
    }
    if (!canEditClient(ctx, item.client_id)) {
      return NextResponse.json(
        { error: "你沒有權限修改此內容。", code: "FORBIDDEN", step: "permission" },
        { status: 403 },
      )
    }

    await deleteContentAttachmentForItem(itemId, attachmentId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "刪除附件失敗。"
    const status = message === "找不到附件。" ? 404 : 500
    console.error("[attachments/attachmentId] DELETE:", message)
    return NextResponse.json(
      {
        error: message,
        code: "ATTACHMENT_DELETE_FAILED",
        step: "delete_attachment",
        detail: message,
      },
      { status },
    )
  }
}
