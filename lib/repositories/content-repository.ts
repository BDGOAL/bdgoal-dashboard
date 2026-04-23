/**
 * Dashboard 內容列讀取：`content_items` → `ContentItem`。
 *
 * - **Asana 真實對應**僅經由 DB 中已由匯入流程寫入的欄位（client／platform／content_type／position／日期／caption 等），
 *   見 `lib/asana-dashboard-field-semantics.ts` 總述。
 * - `brandId`／`accountId` 於 `mapDbRowToDashboard` 由 `pickScopeIds` 填入，**非** Asana 來源。
 */
import type { ContentItem, ContentPlatform, ContentPostType } from "@/lib/types/dashboard"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { stripImageDeliveryParams } from "@/lib/storage/strip-image-delivery-params"

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
  instagram_order?: number | null
  created_at: string
  updated_at: string
}

type DbContentAttachmentRow = {
  id: string
  url: string
  type: string | null
  sort_order: number
}

type DbContentItemWithAttachments = DbContentItem & {
  content_attachments?: DbContentAttachmentRow[] | null
}

function attachmentsFromNestedRow(
  row: DbContentItemWithAttachments,
): Array<{ id?: string; name: string; url: string }> {
  const raw = row.content_attachments
  if (!raw?.length) return []
  return [...raw]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((a) => {
      const rawUrl = a.url
      console.log("[attachment url before strip]", rawUrl)
      const strippedUrl = stripImageDeliveryParams(rawUrl)
      console.log("[attachment url after strip]", strippedUrl)
      return {
        id: a.id,
        name: a.type ?? "asset",
        url: strippedUrl,
      }
    })
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

/**
 * 產生 `ContentItem` 上與 WorkspaceScope 比對用的 `brandId`／`accountId`。
 * **Asana 沒有 brand／account 欄位**；此處以 `clients.id` + platform 合成穩定 id，供頂端範圍篩選對齊。
 */
function pickScopeIds(clientId: string, platform: ContentPlatform) {
  return {
    clientId,
    brandId: `br-${clientId}`,
    accountId: `acc-${clientId}-${platform}`,
  }
}

function mapDbRowToDashboard(
  row: DbContentItem,
  clientNameMap: Record<string, string>,
  attachments: Array<{ id?: string; name: string; url: string }>,
): ContentItem | null {
  const platform = normalizePlatform(row.platform)
  if (!platform) return null
  const refs = pickScopeIds(row.client_id, platform)
  const clientName = clientNameMap[row.client_id] ?? row.client_id
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
    instagramOrder: row.instagram_order ?? null,
  }
}

export async function listDashboardContentItems(): Promise<ContentItem[]> {
  if (process.env.CONTENT_DATA_MODE === "mock") {
    const { mockContentItems } = await import("@/lib/mock/content")
    return mockContentItems
  }
  const supabase = await createSupabaseServerClient()
  const { data: rows, error } = await supabase
    .from("content_items")
    .select(
      `
      *,
      content_attachments (
        id,
        url,
        type,
        sort_order
      )
    `,
    )
    /**
     * 勿使用 `.order("instagram_order")`：若 DB 尚未執行
     * `supabase/migrations/0003_content_items_instagram_order.sql`，PostgREST 會回錯並導致整頁 500。
     * Instagram 牆面順序於 `InstagramManager` 內以 `sortInstagramWallItems` 處理。
     */
    .order("updated_at", { ascending: false })
  if (error) throw new Error(`讀取 content_items 失敗：${error.message}`)

  const rowList = (rows ?? []) as DbContentItemWithAttachments[]
  if (!rowList.length) return []

  const clientIds = Array.from(new Set(rowList.map((r) => r.client_id)))
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id,name")
    .in("id", clientIds.length ? clientIds : ["__none__"])

  if (clientsError) {
    throw new Error(`讀取 clients 失敗：${clientsError.message}`)
  }

  const clientNameMap = Object.fromEntries(
    (clients ?? []).map((c) => [c.id, c.name]),
  )

  return rowList
    .map((r) => {
      const attachments = attachmentsFromNestedRow(r)
      const { content_attachments, ...flat } = r
      void content_attachments
      return mapDbRowToDashboard(flat as DbContentItem, clientNameMap, attachments)
    })
    .filter((x): x is ContentItem => Boolean(x))
}

/**
 * Schema 無獨立 `account` 欄位：以該客戶＋平台下曾出現的 `position` 值代表帳號／欄位槽，供 {@link socialAccountsFromPositionHints} 使用。
 */
export async function fetchDistinctPositionsForClientPlatform(
  clientId: string,
  platform: ContentPlatform,
): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("content_items")
    .select("position")
    .eq("client_id", clientId)
    .eq("platform", platform)

  if (error) {
    console.error(
      "[content-repository] fetchDistinctPositionsForClientPlatform:",
      error.message,
    )
    return []
  }

  const seen = new Set<string>()
  for (const row of data ?? []) {
    const p = row.position
    if (p != null && String(p).trim() !== "") {
      seen.add(String(p).trim())
    }
  }
  return [...seen]
}

