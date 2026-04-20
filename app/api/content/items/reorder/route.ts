import { NextResponse } from "next/server"

import { canEditClient, getPermissionContext } from "@/lib/auth/roles"
import { reorderInstagramWallItems } from "@/lib/content/store"

export const dynamic = "force-dynamic"

type Body = {
  clientId?: string
  orderedIds?: string[]
}

export async function POST(req: Request) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) {
      return NextResponse.json({ error: "未登入。" }, { status: 401 })
    }
    if (ctx.appRole === "viewer") {
      return NextResponse.json({ error: "你沒有編輯權限。" }, { status: 403 })
    }

    const body = (await req.json()) as Body
    const clientId = body.clientId?.trim()
    const orderedIds = body.orderedIds
    if (!clientId) {
      return NextResponse.json({ error: "缺少 clientId。" }, { status: 400 })
    }
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds 須為非空陣列。" }, { status: 400 })
    }
    const normalizedIds = orderedIds.map((id) => String(id).trim()).filter(Boolean)
    if (normalizedIds.length !== orderedIds.length) {
      return NextResponse.json({ error: "orderedIds 含有無效 id。" }, { status: 400 })
    }

    if (!canEditClient(ctx, clientId)) {
      return NextResponse.json({ error: "你沒有權限編排此客戶的內容。" }, { status: 403 })
    }

    await reorderInstagramWallItems({ clientId, orderedIds: normalizedIds })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "排序更新失敗。"
    const status =
      message.includes("排序列表") || message.includes("不屬於") ? 400 : 500
    console.error("[content/items/reorder] POST:", message)
    return NextResponse.json({ error: message }, { status })
  }
}
