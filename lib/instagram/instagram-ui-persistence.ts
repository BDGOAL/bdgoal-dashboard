import type { ContentItem } from "@/lib/types/dashboard"

/** Maps dashboard {@link ContentItem.status} to API PATCH `status`. */
export function contentItemStatusToApi(
  s: ContentItem["status"],
): "planning" | "scheduled" | "published" {
  if (s === "published") return "published"
  if (s === "scheduled") return "scheduled"
  return "planning"
}

/**
 * Items that can be PATCHed via `/api/content/items` (excludes mock `ig-*` demo rows).
 * Mirrors {@link ContentItemEditDialog} eligibility; extend when backend supports more id shapes.
 */
export function isInstagramPersistableItem(item: ContentItem): boolean {
  if (item.id.startsWith("ig-")) return false
  return (
    item.id.startsWith("cnt-") ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      item.id,
    )
  )
}

/** 僅 id（例如 Grid 排序 API） */
export function isPersistableContentItemId(id: string): boolean {
  if (id.startsWith("ig-")) return false
  return (
    id.startsWith("cnt-") ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  )
}

export async function persistInstagramPlannedDateChange(args: {
  item: ContentItem
  plannedPublishDateIso: string | null
  apiStatus: "planning" | "scheduled" | "published"
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { item, plannedPublishDateIso, apiStatus } = args
  if (!isInstagramPersistableItem(item)) {
    return { ok: false, error: "此項目為示範資料，無法寫入伺服器。" }
  }
  try {
    const res = await fetch("/api/content/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        status: apiStatus,
        plannedPublishDate: plannedPublishDateIso,
        expectedUpdatedAt: item.updatedAt,
      }),
    })
    const json = (await res.json()) as { error?: string }
    if (!res.ok) {
      return { ok: false, error: json.error ?? "更新失敗。" }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "網路錯誤，請稍後再試。" }
  }
}
