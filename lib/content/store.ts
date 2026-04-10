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
  status: "planning" | "scheduled" | "published"
  attachments: Array<{
    name: string
    url: string
  }>
  localNotes?: string | null
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
  expectedUpdatedAt?: string
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

async function deriveClientId(client: string) {
  const supabase = await createSupabaseServerClient()
  const trimmed = client.trim()
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
  const payload = {
    // content_items.id is uuid in Supabase; only pass through valid uuid.
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
  const { data, error } = await supabase.from("content_items").upsert(payload).select("*").single()
  if (error) throw new Error(`儲存內容失敗：${error.message}`)
  return {
    ...item,
    id: data.id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export async function createManualContentItem(
  input: CreateManualInput,
): Promise<DashboardStoredContentItem> {
  const now = new Date().toISOString()
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
    status: input.status,
    attachments: [],
    localNotes: input.localNotes ?? null,
    createdAt: now,
    updatedAt: now,
  }
  const ctx = await getPermissionContext()
  if (!ctx) throw new Error("未登入，無法新增內容。")
  return upsertStoredContentItem(item)
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

