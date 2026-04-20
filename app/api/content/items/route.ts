import { NextResponse } from "next/server"

import {
  createManualContentItem,
  getDashboardContentItems,
  listStoredContentItems,
  updateStoredContentItem,
} from "@/lib/content/store"
import { getPermissionContext } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

type CreatePayload = {
  title?: string
  client?: string
  platform?: string
  contentType?: string
  position?: string | null
  caption?: string
  tags?: string[]
  plannedPublishDate?: string | null
  status?: "planning" | "scheduled" | "published"
  localNotes?: string | null
}

type UpdatePayload = {
  id?: string
  status?: "planning" | "scheduled" | "published"
  plannedPublishDate?: string | null
  localNotes?: string | null
  title?: string
  caption?: string
  expectedUpdatedAt?: string
}

export async function GET() {
  const ctx = await getPermissionContext()
  if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
  const [items, stored] = await Promise.all([
    getDashboardContentItems(),
    listStoredContentItems(),
  ])
  return NextResponse.json({
    items,
    storedCount: stored.length,
  })
}

export async function POST(req: Request) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
    if (ctx.appRole === "viewer") {
      return NextResponse.json({ error: "你沒有編輯權限。" }, { status: 403 })
    }
    const body = (await req.json()) as CreatePayload
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "標題為必填。" }, { status: 400 })
    }
    if (!body.client?.trim()) {
      return NextResponse.json({ error: "客戶為必填。" }, { status: 400 })
    }
    if (!body.platform?.trim()) {
      return NextResponse.json({ error: "平台為必填。" }, { status: 400 })
    }
    if (!body.contentType?.trim()) {
      return NextResponse.json({ error: "內容類型為必填。" }, { status: 400 })
    }

    const item = await createManualContentItem({
      title: body.title,
      client: body.client,
      platform: body.platform,
      contentType: body.contentType,
      position: body.position ?? null,
      caption: body.caption ?? "",
      tags: body.tags ?? [],
      plannedPublishDate: body.plannedPublishDate ?? null,
      status: body.status ?? "planning",
      localNotes: body.localNotes ?? null,
    })
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立內容失敗。"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) return NextResponse.json({ error: "未登入。" }, { status: 401 })
    if (ctx.appRole === "viewer") {
      return NextResponse.json({ error: "你沒有編輯權限。" }, { status: 403 })
    }
    const body = (await req.json()) as UpdatePayload
    if (!body.id?.trim()) {
      return NextResponse.json({ error: "缺少內容 id。" }, { status: 400 })
    }
    const item = await updateStoredContentItem({
      id: body.id,
      status: body.status,
      plannedPublishDate: body.plannedPublishDate,
      localNotes: body.localNotes,
      title: body.title?.trim() ?? undefined,
      caption: body.caption,
      expectedUpdatedAt: body.expectedUpdatedAt,
    })
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新內容失敗。"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
