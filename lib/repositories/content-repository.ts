import { mockClients, mockSocialAccounts } from "@/lib/mock/agency"
import { mockContentItems } from "@/lib/mock/content"
import type { ContentItem, ContentPlatform, ContentPostType } from "@/lib/types/dashboard"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type DbContentItem = {
  id: string
  client_id: string
  platform: string
  content_type: string
  title: string
  caption: string
  planned_publish_date: string | null
  scheduled_at: string | null
  status: "planning" | "scheduled" | "published"
  source: "asana" | "manual" | "mock"
  source_task_gid: string | null
  position: string | null
  thumbnail: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

function normalizePlatform(input: string): ContentPlatform | null {
  const v = input.toLowerCase()
  if (["instagram", "ig"].includes(v)) return "instagram"
  if (["youtube", "yt"].includes(v)) return "youtube"
  if (["tiktok", "tt"].includes(v)) return "tiktok"
  if (v === "x") return "x"
  if (v === "threads") return "threads"
  return null
}

function normalizePostType(input: string): ContentPostType {
  const v = input.toLowerCase()
  if (["reels", "reel"].includes(v)) return "reels"
  if (["story", "stories"].includes(v)) return "story"
  if (["carousel"].includes(v)) return "carousel"
  if (["short", "shorts"].includes(v)) return "short"
  return "feed"
}

function pickScopeIds(clientId: string, platform: ContentPlatform) {
  const acc =
    mockSocialAccounts.find((a) => a.clientId === clientId && a.platform === platform) ??
    mockSocialAccounts.find((a) => a.clientId === clientId)
  if (acc) return { clientId: acc.clientId, brandId: acc.brandId, accountId: acc.id }
  return { clientId, brandId: "br-imported", accountId: `acc-imported-${platform}` }
}

function mapDbRowToDashboard(
  row: DbContentItem,
  clientNameMap: Record<string, string>,
  attachments: Array<{ name: string; url: string }>,
): ContentItem | null {
  const platform = normalizePlatform(row.platform)
  if (!platform) return null
  const refs = pickScopeIds(row.client_id, platform)
  const clientName =
    clientNameMap[row.client_id] ??
    mockClients.find((c) => c.id === row.client_id)?.name ??
    row.client_id
  return {
    id: row.id,
    source: row.source,
    sourceRef: row.source_task_gid ? { asanaTaskId: row.source_task_gid } : {},
    title: row.title,
    platform,
    postType: normalizePostType(row.content_type),
    contentTypeName: row.content_type,
    position: row.position,
    clientName,
    caption: row.caption,
    status: row.status === "planning" ? "draft" : row.status,
    plannedPublishDate: row.planned_publish_date,
    scheduledAt: row.scheduled_at ?? row.planned_publish_date,
    publishedAt: row.status === "published" ? row.scheduled_at ?? row.planned_publish_date : null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    tags: [],
    thumbnail: row.thumbnail,
    author: row.source === "asana" ? "Asana 匯入" : "手動",
    attachments,
    localNotes: row.internal_notes,
    clientId: refs.clientId,
    brandId: refs.brandId,
    accountId: refs.accountId,
  }
}

export async function listDashboardContentItems(): Promise<ContentItem[]> {
  if (process.env.CONTENT_DATA_MODE === "mock") return mockContentItems
  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from("content_items")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) throw new Error(`讀取 content_items 失敗：${error.message}`)

  const clientIds = Array.from(new Set((rows ?? []).map((r) => r.client_id)))
  const { data: clients } = await supabase
    .from("clients")
    .select("id,name")
    .in("id", clientIds.length ? clientIds : ["__none__"])
  const clientNameMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c.name]))

  const ids = (rows ?? []).map((r) => r.id)
  if (!ids.length) return []
  const { data: atts, error: attErr } = await supabase
    .from("content_attachments")
    .select("id, content_item_id, url, type, sort_order")
          .in("content_item_id", ids)
    .order("sort_order", { ascending: true })
  if (attErr) throw new Error(`讀取 attachments 失敗：${attErr.message}`)

  const byItem = new Map<string, Array<{ name: string; url: string }>>()
  for (const a of atts ?? []) {
    const arr = byItem.get(a.content_item_id) ?? []
    arr.push({ name: a.type ?? "asset", url: a.url })
    byItem.set(a.content_item_id, arr)
  }

  return (rows ?? [])
    .map((r) =>
      mapDbRowToDashboard(r as DbContentItem, clientNameMap, byItem.get(r.id) ?? []),
    )
    .filter((x): x is ContentItem => Boolean(x))
}

