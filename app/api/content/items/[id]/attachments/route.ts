import { NextResponse } from "next/server"

import { canEditClient, getPermissionContext } from "@/lib/auth/roles"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role"
import {
  CONTENT_MEDIA_BUCKET,
  CONTENT_MEDIA_ITEMS_PREFIX,
} from "@/lib/storage/content-media-bucket"

export const dynamic = "force-dynamic"

/** 與許多邊緣主機請求上限對齊；更大檔請改走客戶端壓縮。 */
const MAX_BYTES = 6 * 1024 * 1024
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

type ErrorBody = {
  error: string
  code: string
  step: string
  /** Supabase or platform message when safe to expose */
  detail?: string
}

function jsonError(
  status: number,
  body: ErrorBody,
  logPrefix: string,
  logExtra?: string,
) {
  console.error(`[attachments] ${logPrefix}`, body.step, body.code, logExtra ?? body.detail ?? "")
  return NextResponse.json(body, { status })
}

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

/** Infer image/* when browser sends empty `file.type` (common with some drag sources). */
function normalizeImageMime(file: File): string {
  const t = (file.type || "").trim().toLowerCase()
  if (t && t !== "application/octet-stream") return t
  const n = file.name.toLowerCase()
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg"
  if (n.endsWith(".png")) return "image/png"
  if (n.endsWith(".webp")) return "image/webp"
  if (n.endsWith(".gif")) return "image/gif"
  if (n.endsWith(".svg")) return "image/svg+xml"
  return t || "application/octet-stream"
}

function mapStorageErrorMessage(raw: string): { code: string; hint: string } {
  const m = raw.toLowerCase()
  if (m.includes("bucket not found") || m.includes("not found")) {
    return {
      code: "BUCKET_MISSING",
      hint: `Storage 找不到 bucket「${CONTENT_MEDIA_BUCKET}」。請在 Supabase 建立同名 bucket 或設定 NEXT_PUBLIC_SUPABASE_CONTENT_MEDIA_BUCKET。`,
    }
  }
  if (m.includes("new row violates row-level security") || m.includes("rls") || m.includes("policy")) {
    return {
      code: "STORAGE_RLS",
      hint: "Storage 權限被拒（RLS／policy）。若上傳改由 service role 仍失敗，請檢查 bucket 是否存在與專案設定。",
    }
  }
  if (m.includes("jwt") || m.includes("unauthorized") || m.includes("permission denied")) {
    return {
      code: "STORAGE_AUTH",
      hint: "Storage 回報未授權。請檢查 storage.objects 的 insert 政策與金鑰設定。",
    }
  }
  return { code: "STORAGE_UPLOAD", hint: raw }
}

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const ctx = await getPermissionContext()
    if (!ctx) {
      return jsonError(401, {
        error: "未登入。",
        code: "UNAUTHORIZED",
        step: "auth_session",
      }, "auth")
    }
    if (ctx.appRole === "viewer") {
      return jsonError(403, {
        error: "你沒有編輯權限。",
        code: "FORBIDDEN",
        step: "auth_role",
      }, "auth")
    }

    const { id: itemId } = await params
    if (!itemId?.trim()) {
      return jsonError(400, {
        error: "缺少內容 id。",
        code: "BAD_REQUEST",
        step: "validate_params",
      }, "validate")
    }

    const userSb = await createSupabaseServerClient()

    const { data: item, error: itemErr } = await userSb
      .from("content_items")
      .select("id, client_id, thumbnail")
      .eq("id", itemId)
      .maybeSingle()

    if (itemErr || !item) {
      return jsonError(404, {
        error: "找不到內容項目。",
        code: "NOT_FOUND",
        step: "load_content_item",
        detail: itemErr?.message,
      }, "item", itemErr?.message)
    }

    if (!canEditClient(ctx, item.client_id)) {
      return jsonError(403, {
        error: "你沒有權限為此客戶上傳附件。",
        code: "FORBIDDEN",
        step: "permission_client",
      }, "perm")
    }

    let admin: ReturnType<typeof createSupabaseServiceRoleClient>
    try {
      admin = createSupabaseServiceRoleClient()
    } catch (envErr) {
      const msg = envErr instanceof Error ? envErr.message : String(envErr)
      console.error("[attachments] service client:", msg)
      return jsonError(503, {
        error: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY，無法完成上傳。",
        code: "SERVICE_ROLE_MISSING",
        step: "service_client",
      }, "env")
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const low = msg.toLowerCase()
      const looks413 =
        low.includes("413") ||
        low.includes("too large") ||
        low.includes("payload") ||
        low.includes("body") ||
        low.includes("limit")
      console.error("[attachments] formData parse failed:", looks413 ? "likely_413" : "", msg)
      return jsonError(413, {
        error:
          "上傳本文超過主機單次請求上限（常見為 413 / FUNCTION_PAYLOAD_TOO_LARGE）。請在客戶端縮小或壓縮圖片後再試。",
        code: "FUNCTION_PAYLOAD_TOO_LARGE",
        step: "parse_body",
        detail: looks413 ? msg.slice(0, 200) : msg.slice(0, 120),
      }, "payload")
    }
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return jsonError(400, {
        error: "請提供檔案欄位 file。",
        code: "BAD_REQUEST",
        step: "validate_file",
      }, "validate")
    }

    if (file.size > MAX_BYTES) {
      return jsonError(413, {
        error: `單檔超過伺服器允許上限（${Math.round(MAX_BYTES / 1024 / 1024)}MB）。請先壓縮圖片。`,
        code: "PAYLOAD_TOO_LARGE",
        step: "validate_file",
      }, "validate")
    }

    const mime = normalizeImageMime(file)
    if (!ALLOWED.has(mime)) {
      return jsonError(400, {
        error: "不支援的圖片格式，請使用 JPEG、PNG、WebP、GIF 或 SVG。",
        code: "UNSUPPORTED_MIME",
        step: "validate_mime",
        detail: mime || "(empty)",
      }, "mime", mime)
    }

    const labelRaw = formData.get("type")
    const typeLabel =
      typeof labelRaw === "string" && labelRaw.trim()
        ? labelRaw.trim().slice(0, 200)
        : file.name.replace(/\s+/g, " ").trim().slice(0, 200) || "image"

    const ext = extFromName(file.name, mime)
    const objectPath = `${CONTENT_MEDIA_ITEMS_PREFIX}/${itemId}/${Date.now()}-${crypto.randomUUID().slice(0, 10)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await admin.storage
      .from(CONTENT_MEDIA_BUCKET)
      .upload(objectPath, buffer, {
        contentType: mime,
        upsert: false,
      })

    if (uploadErr) {
      const mapped = mapStorageErrorMessage(uploadErr.message)
      return jsonError(500, {
        error: `${mapped.hint}（${mapped.code}）`,
        code: mapped.code,
        step: "storage_upload",
        detail: uploadErr.message,
      }, "storage", uploadErr.message)
    }

    const { data: pub } = admin.storage
      .from(CONTENT_MEDIA_BUCKET)
      .getPublicUrl(objectPath)
    const publicUrl = pub.publicUrl

    const { data: lastRow } = await admin
      .from("content_attachments")
      .select("sort_order")
      .eq("content_item_id", itemId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = (lastRow?.sort_order ?? -1) + 1

    const { data: row, error: insErr } = await admin
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
      const { error: rmErr } = await admin.storage
        .from(CONTENT_MEDIA_BUCKET)
        .remove([objectPath])
      if (rmErr) {
        console.error("[attachments] rollback storage remove:", rmErr.message)
      }
      return jsonError(500, {
        error: `已上傳至 Storage，但寫入附件紀錄失敗：${insErr?.message ?? "unknown"}。已嘗試刪除暫存物件。`,
        code: "ATTACHMENT_INSERT_FAILED",
        step: "attachment_insert",
        detail: insErr?.message,
      }, "db", insErr?.message)
    }

    const shouldSetThumbnail = !item.thumbnail?.trim()
    if (shouldSetThumbnail) {
      const { error: thumbErr } = await admin
        .from("content_items")
        .update({ thumbnail: publicUrl })
        .eq("id", itemId)

      if (thumbErr) {
        console.warn("[attachments] thumbnail update:", thumbErr.message)
        return NextResponse.json({
          ok: true,
          attachment: row,
          url: publicUrl,
          warning: {
            step: "thumbnail_update",
            code: "THUMBNAIL_UPDATE_FAILED",
            message: thumbErr.message,
          },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      attachment: row,
      url: publicUrl,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "上傳失敗。"
    console.error("[attachments] unhandled:", message)
    return jsonError(500, {
      error: message,
      code: "INTERNAL",
      step: "unhandled",
    }, "fatal", message)
  }
}
