import type { SupabaseClient } from "@supabase/supabase-js"
import type { AsanaReadyItem } from "@/lib/integrations/asana-normalize"
import type { ContentItem } from "@/lib/types/dashboard"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { listDashboardContentItems } from "@/lib/repositories/content-repository"
import { getPermissionContext } from "@/lib/auth/roles"

export type DashboardStoredContentItem = {
  id: string
  source: "asana" | "manual"
  sourceRef?: {
    asanaTaskId?: string
  }
  client: string
  platform: string
  contentType: string
  position?: string | null
  title: string
  caption: string
  tags: string[]
  plannedPublishDate?: string | null
  /** 若指定則一併寫入 `scheduled_at`（否則 upsert 不覆寫該欄） */
  scheduledAt?: string | null
  status: "planning" | "scheduled" | "published"
  attachments: Array<{
    name: string
    url: string
  }>
  localNotes?: string | null
  /** 若指定則寫入 `instagram_order`（否則不覆寫，避免 Asana 同步洗掉排序） */
  instagramOrder?: number | null
  createdAt: string
  updatedAt: string
}

export type AsanaImportOutcome = "created" | "updated"

export type CreateManualInput = {
  title: string
  client: string
  platform: string
  contentType: string
  position?: string | null
  caption: string
  tags?: string[]
  plannedPublishDate?: string | null
  status: DashboardStoredContentItem["status"]
  localNotes?: string | null
}

export type UpdateStoredInput = {
  id: string
  status?: DashboardStoredContentItem["status"]
  plannedPublishDate?: string | null
  localNotes?: string | null
  caption?: string
  expectedUpdatedAt?: string
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

/** Resolve existing clients.id by id / name / slug hint only (no insert). */
async function lookupClientIdHint(
  supabase: SupabaseClient,
  trimmed: string,
): Promise<string | null> {
  const { data: byId } = await supabase
    .from("clients")
    .select("id")
    .eq("id", trimmed)
    .maybeSingle()
  if (byId?.id) return byId.id

  const { data: byName } = await supabase
    .from("clients")
    .select("id")
    .eq("name", trimmed)
    .maybeSingle()
  if (byName?.id) return byName.id

  const slug = trimmed.toLowerCase().replace(/\s+/g, "-")
  const { data: bySlug } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()
  if (bySlug?.id) return bySlug.id

  return null
}

function slugifyClientLabel(trimmed: string): string {
  const base = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  return base.length ? base : `client-${crypto.randomUUID().slice(0, 8)}`
}

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505"
}

function isInstagramPlatformDb(platform: string): boolean {
  const v = platform.trim().toLowerCase()
  return v === "instagram" || v === "ig"
}

function isLikelyMissingInstagramOrderColumn(
  err: { message?: string; code?: string } | null | undefined,
): boolean {
  const m = (err?.message ?? "").toLowerCase()
  return (
    m.includes("instagram_order") &&
    (m.includes("does not exist") ||
      m.includes("unknown") ||
      m.includes("column") ||
      err?.code === "42703")
  )
}

/** 同一客戶底下所有 Instagram／ig 列之最大 `instagram_order` + 1（無則 0） */
async function nextInstagramWallOrder(
  supabase: SupabaseClient,
  clientId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("content_items")
    .select("instagram_order, platform")
    .eq("client_id", clientId)
  if (error) {
    if (isLikelyMissingInstagramOrderColumn(error)) {
      console.warn(
        "[content/store] instagram_order 欄位可能尚未 migration，略過讀取排序：",
        error.message,
      )
      return 0
    }
    throw new Error(`讀取排序失敗：${error.message}`)
  }
  const nums = (data ?? [])
    .filter((r) => isInstagramPlatformDb(r.platform))
    .map((r) => r.instagram_order)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
  if (!nums.length) return 0
  return Math.max(...nums) + 1
}

async function insertNewClientByName(
  supabase: SupabaseClient,
  trimmed: string,
): Promise<string> {
  const baseSlug = slugifyClientLabel(trimmed)

  for (let attempt = 0; attempt < 12; attempt++) {
    const slug =
      attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`
    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from("clients")
      .insert({
        id,
        name: trimmed,
        slug,
        status: "active",
      })
      .select("id")
      .single()

    if (!error && data?.id) return data.id
    if (isUniqueViolation(error)) continue
    throw new Error(
      error
        ? `無法建立客戶「${trimmed}」：${error.message}`
        : `無法建立客戶「${trimmed}」。`,
    )
  }

  throw new Error(`無法建立客戶「${trimmed}」：slug 衝突，請重試。`)
}

/**
 * Webhook / service-role：使用呼叫端建立的 Supabase client（含 service role）解析或建立 clients 列。
 * 不依賴瀏覽器 session，也不寫入 client_memberships（無「目前使用者」可授權）。
 */
export async function ensureClientRecordByNameForService(
  supabase: SupabaseClient,
  clientName: string,
): Promise<string> {
  const trimmed = clientName.trim()
  if (!trimmed) {
    throw new Error("客戶名稱不可為空白。")
  }

  const existingId = await lookupClientIdHint(supabase, trimmed)
  if (existingId) return existingId

  return insertNewClientByName(supabase, trimmed)
}

async function deriveClientId(client: string) {
  const supabase = await createSupabaseServerClient()
  const trimmed = client.trim()
  const existingId = await lookupClientIdHint(supabase, trimmed)
  if (existingId) return existingId

  throw new Error(
    `找不到對應客戶：「${trimmed}」。請確認 Supabase public.clients 已建立此客戶（id / name / slug 至少一項相符），且目前帳號在 client_memberships 有讀取該客戶；原型環境可參考 supabase/README 的 cl-aurora / cl-pulse 種子說明。`,
  )
}

export async function listStoredContentItems(): Promise<DashboardStoredContentItem[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) throw new Error(`讀取 content_items 失敗：${error.message}`)
  return (data ?? []).map((r) => ({
    id: r.id,
    source: r.source,
    sourceRef: r.source_task_gid ? { asanaTaskId: r.source_task_gid } : {},
    client: r.client_id,
    platform: r.platform,
    contentType: r.content_type,
    position: r.position,
    title: r.title,
    caption: r.caption,
    tags: [],
    plannedPublishDate: r.planned_publish_date,
    status: r.status,
    attachments: [],
    localNotes: r.internal_notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })) as DashboardStoredContentItem[]
}

export async function listStoredAsanaRefs(): Promise<
  Record<string, { id: string; updatedAt: string }>
> {
  const items = await listStoredContentItems()
  const out: Record<string, { id: string; updatedAt: string }> = {}
  for (const i of items) {
    const taskId = i.source === "asana" ? i.sourceRef?.asanaTaskId : undefined
    if (!taskId) continue
    out[taskId] = { id: i.id, updatedAt: i.updatedAt }
  }
  return out
}

export function mapAsanaReadyToStoredContentItem(
  item: AsanaReadyItem,
): DashboardStoredContentItem {
  const now = new Date().toISOString()
  return {
    id: `cnt-asana-${item.asanaTaskId}`,
    source: "asana",
    sourceRef: { asanaTaskId: item.asanaTaskId },
    client: item.client ?? "Unknown client",
    platform: item.platform ?? "Unknown platform",
    contentType: item.contentType ?? "Unknown content type",
    position: item.position,
    title: item.title,
    caption: item.finalCaption ?? "",
    tags: item.tags ?? [],
    plannedPublishDate: item.plannedPublishDate,
    status: item.plannedPublishDate ? "scheduled" : "planning",
    attachments: item.attachments
      .map((a) => ({
        name: a.name,
        url: a.viewUrl ?? a.downloadUrl ?? "",
      }))
      .filter((a) => a.url),
    localNotes: null,
    createdAt: now,
    updatedAt: now,
  }
}

export async function upsertFromAsana(
  incoming: DashboardStoredContentItem,
): Promise<{ item: DashboardStoredContentItem; outcome: AsanaImportOutcome }> {
  const taskId = incoming.sourceRef?.asanaTaskId
  if (!taskId) return { item: await upsertStoredContentItem(incoming), outcome: "created" }

  const supabase = await createSupabaseServerClient()
  const { data: existing } = await supabase
    .from("content_items")
    .select("*")
    .eq("source", "asana")
    .eq("source_task_gid", taskId)
    .maybeSingle()

  const clientId = await deriveClientId(incoming.client)
  const payload = {
    client_id: clientId,
    platform: incoming.platform,
    content_type: incoming.contentType,
    title: incoming.title,
    caption: incoming.caption,
    planned_publish_date: incoming.plannedPublishDate ?? null,
    status: existing?.status ?? incoming.status,
    source: "asana",
    source_task_gid: taskId,
    position: incoming.position ?? null,
    internal_notes: existing?.internal_notes ?? null,
  }

  if (existing) {
    const { data, error } = await supabase
      .from("content_items")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single()
    if (error) throw new Error(`更新 Asana 項目失敗：${error.message}`)
    await supabase.from("content_attachments").delete().eq("content_item_id", existing.id)
    if (incoming.attachments.length) {
      await supabase.from("content_attachments").insert(
        incoming.attachments.map((a, idx) => ({
          content_item_id: existing.id,
          url: a.url,
          type: a.name,
          sort_order: idx,
        })),
      )
    }
    return {
      outcome: "updated",
      item: {
        ...incoming,
        id: data.id,
        updatedAt: data.updated_at,
        createdAt: data.created_at,
      },
    }
  }

  const { data, error } = await supabase
    .from("content_items")
    .insert(payload)
    .select("*")
    .single()
  if (error) throw new Error(`建立 Asana 項目失敗：${error.message}`)
  if (incoming.attachments.length) {
    await supabase.from("content_attachments").insert(
      incoming.attachments.map((a, idx) => ({
        content_item_id: data.id,
        url: a.url,
        type: a.name,
        sort_order: idx,
      })),
    )
  }
  return {
    outcome: "created",
    item: {
      ...incoming,
      id: data.id,
      updatedAt: data.updated_at,
      createdAt: data.created_at,
    },
  }
}

export async function upsertStoredContentItem(
  item: DashboardStoredContentItem,
): Promise<DashboardStoredContentItem> {
  const supabase = await createSupabaseServerClient()
  const clientId = await deriveClientId(item.client)
  const payload: Record<string, unknown> = {
    id: isUuid(item.id) ? item.id : undefined,
    client_id: clientId,
    platform: item.platform,
    content_type: item.contentType,
    title: item.title,
    caption: item.caption,
    planned_publish_date: item.plannedPublishDate ?? null,
    status: item.status,
    source: item.source,
    source_task_gid: item.sourceRef?.asanaTaskId ?? null,
    position: item.position ?? null,
    internal_notes: item.localNotes ?? null,
  }
  if (item.scheduledAt !== undefined) {
    payload.scheduled_at = item.scheduledAt
  }
  if (item.instagramOrder !== undefined) {
    payload.instagram_order = item.instagramOrder
  }
  let { data, error } = await supabase
    .from("content_items")
    .upsert(payload)
    .select("*")
    .single()
  if (error && isLikelyMissingInstagramOrderColumn(error) && "instagram_order" in payload) {
    console.warn(
      "[content/store] upsert：略過 instagram_order（欄位可能尚未 migration）：",
      error.message,
    )
    const { instagram_order: _io, ...withoutOrder } = payload
    const second = await supabase
      .from("content_items")
      .upsert(withoutOrder)
      .select("*")
      .single()
    data = second.data
    error = second.error
  }
  if (error) throw new Error(`儲存內容失敗：${error.message}`)
  if (!data) throw new Error("儲存內容失敗：無回傳資料。")
  return {
    ...item,
    id: data.id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    instagramOrder: data.instagram_order ?? item.instagramOrder,
  }
}

export async function createManualContentItem(
  input: CreateManualInput,
): Promise<DashboardStoredContentItem> {
  const now = new Date().toISOString()
  const ctx = await getPermissionContext()
  if (!ctx) throw new Error("未登入，無法新增內容。")
  const supabase = await createSupabaseServerClient()
  const clientId = await deriveClientId(input.client.trim())
  const plat = input.platform.trim().toLowerCase()
  let igOrder: number | undefined
  if (plat === "instagram" || plat === "ig") {
    igOrder = await nextInstagramWallOrder(supabase, clientId)
  }
  const item: DashboardStoredContentItem = {
    id: crypto.randomUUID(),
    source: "manual",
    sourceRef: {},
    title: input.title.trim(),
    client: input.client.trim(),
    platform: input.platform.trim(),
    contentType: input.contentType.trim(),
    position: input.position ?? null,
    caption: input.caption.trim(),
    tags: input.tags ?? [],
    plannedPublishDate: input.plannedPublishDate ?? null,
    scheduledAt: null,
    status: input.status,
    attachments: [],
    localNotes: input.localNotes ?? null,
    instagramOrder: igOrder,
    createdAt: now,
    updatedAt: now,
  }
  return upsertStoredContentItem(item)
}

/**
 * 持久化 Instagram 牆面順序（`instagram_order` = 陣列索引）。
 * 呼叫端須已驗證權限；`orderedIds` 須與該客戶底下所有 Instagram 列 id 一致。
 */
export async function reorderInstagramWallItems(input: {
  clientId: string
  orderedIds: string[]
}): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: rows, error: qErr } = await supabase
    .from("content_items")
    .select("id, client_id, platform")
    .eq("client_id", input.clientId)
  if (qErr) throw new Error(`讀取內容失敗：${qErr.message}`)
  const igRows = (rows ?? []).filter((r) => isInstagramPlatformDb(r.platform))
  const expected = new Set(igRows.map((r) => r.id))
  if (expected.size !== input.orderedIds.length) {
    throw new Error("排序列表須包含此客戶所有 Instagram 貼文。")
  }
  for (const id of input.orderedIds) {
    if (!expected.has(id)) {
      throw new Error("排序列表含有不屬於此客戶或平台的項目。")
    }
  }
  for (let i = 0; i < input.orderedIds.length; i++) {
    const { error } = await supabase
      .from("content_items")
      .update({ instagram_order: i })
      .eq("id", input.orderedIds[i])
    if (error) throw new Error(`更新排序失敗：${error.message}`)
  }
}

export async function updateStoredContentItem(
  input: UpdateStoredInput,
): Promise<DashboardStoredContentItem> {
  const supabase = await createSupabaseServerClient()
  const { data: prev, error: prevErr } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", input.id)
    .single()
  if (prevErr || !prev) throw new Error("找不到內容項目。")
  if (input.expectedUpdatedAt && input.expectedUpdatedAt !== prev.updated_at) {
    throw new Error("此項目已被其他人更新，請重新整理後再試。")
  }
  const { data, error } = await supabase
    .from("content_items")
    .update({
      status: input.status ?? prev.status,
      planned_publish_date:
        input.plannedPublishDate !== undefined
          ? input.plannedPublishDate
          : prev.planned_publish_date,
      internal_notes:
        input.localNotes !== undefined ? input.localNotes : prev.internal_notes,
      caption: input.caption !== undefined ? input.caption : prev.caption,
    })
    .eq("id", input.id)
    .select("*")
    .single()
  if (error) throw new Error(`更新內容失敗：${error.message}`)
  return {
    id: data.id,
    source: data.source,
    sourceRef: data.source_task_gid ? { asanaTaskId: data.source_task_gid } : {},
    client: data.client_id,
    platform: data.platform,
    contentType: data.content_type,
    position: data.position,
    title: data.title,
    caption: data.caption,
    tags: [],
    plannedPublishDate: data.planned_publish_date,
    status: data.status,
    attachments: [],
    localNotes: data.internal_notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function getDashboardContentItems(): Promise<ContentItem[]> {
  return listDashboardContentItems()
}

/**
 * 刪除單一內容列與其附件列（不含 Storage 物件清理 — 見 API 註解）。
 * 呼叫端須先驗證權限與 `source === "manual"`。
 */
export async function deleteManualContentItem(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: prev, error: prevErr } = await supabase
    .from("content_items")
    .select("id, source")
    .eq("id", id)
    .maybeSingle()
  if (prevErr || !prev) {
    throw new Error("找不到內容項目。")
  }
  if (prev.source !== "manual") {
    throw new Error("僅能刪除手動建立的內容。")
  }
  const { error: attErr } = await supabase
    .from("content_attachments")
    .delete()
    .eq("content_item_id", id)
  if (attErr) {
    throw new Error(`刪除附件失敗：${attErr.message}`)
  }
  const { error: delErr } = await supabase.from("content_items").delete().eq("id", id)
  if (delErr) {
    throw new Error(`刪除內容失敗：${delErr.message}`)
  }
}

/**
 * 刪除單一附件並將 `content_items.thumbnail` 重設為剩餘附件中 sort_order 最小者（無則 null）。
 * 呼叫端須驗證權限。Storage 物件不自動刪除（TODO）。
 */
export async function deleteContentAttachmentForItem(
  contentItemId: string,
  attachmentId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: att, error: aErr } = await supabase
    .from("content_attachments")
    .select("id, content_item_id")
    .eq("id", attachmentId)
    .maybeSingle()
  if (aErr || !att || att.content_item_id !== contentItemId) {
    throw new Error("找不到附件。")
  }
  const { error: dErr } = await supabase.from("content_attachments").delete().eq("id", attachmentId)
  if (dErr) {
    throw new Error(`刪除附件失敗：${dErr.message}`)
  }
  const { data: remaining, error: rErr } = await supabase
    .from("content_attachments")
    .select("url, sort_order")
    .eq("content_item_id", contentItemId)
    .order("sort_order", { ascending: true })
  if (rErr) {
    throw new Error(`讀取剩餘附件失敗：${rErr.message}`)
  }
  const nextThumb = remaining?.[0]?.url ?? null
  const { error: uErr } = await supabase
    .from("content_items")
    .update({ thumbnail: nextThumb })
    .eq("id", contentItemId)
  if (uErr) {
    throw new Error(`更新縮圖失敗：${uErr.message}`)
  }
}

