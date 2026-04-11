import type { ContentItem } from "@/lib/types/dashboard"

/** Client-side refetch of the same shape as RSC `getDashboardContentItems()`. */
export async function fetchDashboardContentItems(): Promise<
  ContentItem[] | null
> {
  try {
    const res = await fetch("/api/content/items", { cache: "no-store" })
    const json = (await res.json()) as { items?: ContentItem[]; error?: string }
    if (!res.ok) return null
    return json.items ?? null
  } catch {
    return null
  }
}
