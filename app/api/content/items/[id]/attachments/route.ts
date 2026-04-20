import { NextResponse } from "next/server"

import { canEditClient, getPermissionContext } from "@/lib/auth/roles"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  CONTENT_MEDIA_BUCKET,
  CONTENT_MEDIA_ITEMS_PREFIX,
} from "@/lib/storage/content-media-bucket"

export const dynamic = "force-dynamic"

const MAX_BYTES = 12 * 1024 * 1024
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

function extFromName(name: string, mime: string): string {
  const fromName = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName
  if (mime === "image/jpeg") return "jpg"
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  if (mime === "image/gif") return "gif"
  if (mime === "image/svg+xml") return "svg"
  return "bin"
}

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) {
      return NextResponse.json({ error: "未登入。" }, { status: 401 })
    }
    if (ctx.appRole === "viewer") {
      return NextResponse.json({ error: "你沒有編輯權限。" }, { status: 403 })
    }

    const { id: itemId } = await params
    if (!itemId?.trim()) {
      return NextResponse.json({ error: "缺少內容 id。" }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const { data: item, error: itemErr } = await supabase
      .from("content_items")
      .select("id, client_id")
      .eq("id", itemId)
      .maybeSingle()

    if (itemErr || !item) {
      return NextResponse.json({ error: "找不到內容項目。" }, { status: 404 })
    }

    if (!canEditClient(ctx, item.client_id)) {
      return NextResponse.json({ error: "你沒有權限為此客戶上傳附件。" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "請提供檔案欄位 file。" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "檔案過大（上限 12MB）。" },
        { status: 413 },
      )
    }

    const mime = file.type || "application/octet-stream"
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "不支援的圖片格式，請使用 JPEG、PNG、WebP、GIF 或 SVG。" },
        { status: 400 },
      )
    }

    const labelRaw = formData.get("type")
    const typeLabel =
      typeof labelRaw === "string" && labelRaw.trim()
        ? labelRaw.trim().slice(0, 200)
        : file.name.replace(/\s+/g, " ").trim().slice(0, 200) || "image"

    const ext = extFromName(file.name, mime)
    const objectPath = `${CONTENT_MEDIA_ITEMS_PREFIX}/${itemId}/${Date.now()}-${crypto.randomUUID().slice(0, 10)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await supabase.storage
      .from(CONTENT_MEDIA_BUCKET)
      .upload(objectPath, buffer, {
        contentType: mime,
        upsert: false,
      })

    if (uploadErr) {
      console.error("[attachments] storage upload:", uploadErr.message)
      return NextResponse.json(
        {
          error: `上傳失敗：${uploadErr.message}。請確認 Storage bucket「${CONTENT_MEDIA_BUCKET}」已建立且政策允許已登入使用者上傳。`,
        },
        { status: 500 },
      )
    }

    const { data: pub } = supabase.storage
      .from(CONTENT_MEDIA_BUCKET)
      .getPublicUrl(objectPath)
    const publicUrl = pub.publicUrl

    const { data: lastRow } = await supabase
      .from("content_attachments")
      .select("sort_order")
      .eq("content_item_id", itemId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = (lastRow?.sort_order ?? -1) + 1

    const { data: row, error: insErr } = await supabase
      .from("content_attachments")
      .insert({
        content_item_id: itemId,
        url: publicUrl,
        type: typeLabel,
        sort_order: sortOrder,
      })
      .select("id, url, type, sort_order")
      .single()

    if (insErr || !row) {
      console.error("[attachments] insert:", insErr?.message)
      return NextResponse.json(
        { error: `已上傳檔案，但寫入附件紀錄失敗：${insErr?.message ?? "unknown"}` },
        { status: 500 },
      )
    }

    if (sortOrder === 0) {
      const { error: thumbErr } = await supabase
        .from("content_items")
        .update({ thumbnail: publicUrl })
        .eq("id", itemId)

      if (thumbErr) {
        console.warn("[attachments] thumbnail update:", thumbErr.message)
      }
    }

    return NextResponse.json({
      ok: true,
      attachment: row,
      url: publicUrl,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "上傳失敗。"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
