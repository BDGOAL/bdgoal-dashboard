import { NextResponse } from "next/server"

import { fetchAsanaReadyItemByTaskId } from "@/lib/integrations/asana"
import {
  mapAsanaReadyToStoredContentItem,
  upsertFromAsana,
} from "@/lib/content/store"
import { getPermissionContext } from "@/lib/auth/roles"

type ImportPayload = {
  asanaTaskId?: string
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
    if (ctx.appRole === "viewer") {
      return NextResponse.json({ error: "你沒有匯入權限。" }, { status: 403 })
    }
    const body = (await req.json()) as ImportPayload
    const taskId = body?.asanaTaskId?.trim()
    if (!taskId) {
      return NextResponse.json({ error: "缺少 asanaTaskId。" }, { status: 400 })
    }

    // Re-validate with latest Asana data before persisting.
    const readyItem = await fetchAsanaReadyItemByTaskId(taskId)
    if (!readyItem) {
      return NextResponse.json(
        {
          error:
            "此任務目前不符合 Ready-to-sync 條件（可能欄位或附件已變更）。",
        },
        { status: 409 },
      )
    }

    const stored = mapAsanaReadyToStoredContentItem(readyItem)
    const result = await upsertFromAsana(stored)

    return NextResponse.json({
      ok: true,
      id: result.item.id,
      asanaTaskId: taskId,
      status: result.item.status,
      outcome: result.outcome,
      updatedAt: result.item.updatedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "匯入失敗。"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
