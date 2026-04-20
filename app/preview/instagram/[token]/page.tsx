import { sortInstagramWallItems } from "@/lib/instagram/instagram-wall-sort"
import { getPreviewByToken } from "@/lib/repositories/preview-repository"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { ContentItem } from "@/lib/types/dashboard"
import { PreviewGridClient } from "./preview-grid-client"

type Row = {
  id: string
  title: string
  caption: string
  status: "planning" | "scheduled" | "published"
  thumbnail: string | null
  planned_publish_date: string | null
  scheduled_at: string | null
  updated_at: string
  created_at: string
  instagram_order: number | null
  content_attachments?: Array<{ url: string | null; sort_order: number | null }> | null
}

function mapPreviewRow(row: Row): ContentItem {
  const attachments = [...(row.content_attachments ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .filter((a) => Boolean(a.url?.trim()))
    .map((a) => ({ name: "asset", url: a.url!.trim() }))
  return {
    id: row.id,
    source: "manual",
    title: row.title,
    platform: "instagram",
    postType: "feed",
    caption: row.caption ?? "",
    status: row.status === "planning" ? "draft" : row.status,
    plannedPublishDate: row.planned_publish_date,
    scheduledAt: row.scheduled_at ?? row.planned_publish_date,
    publishedAt: row.status === "published" ? row.scheduled_at ?? row.planned_publish_date : null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    tags: [],
    thumbnail: row.thumbnail,
    author: "preview",
    attachments,
    clientId: "",
    brandId: "",
    accountId: "",
    instagramOrder: row.instagram_order,
  }
}

export default async function InstagramPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const preview = await getPreviewByToken(token)
  if (!preview || preview.view_type !== "grid") {
    return <main className="p-8 text-sm">Preview unavailable.</main>
  }
  if (preview.expires_at && new Date(preview.expires_at) < new Date()) {
    return <main className="p-8 text-sm">Preview unavailable.</main>
  }

  const supabase = await createSupabaseServerClient()
  const [{ data: client }, { data: rows, error }] = await Promise.all([
    supabase.from("clients").select("id,name").eq("id", preview.client_id).maybeSingle(),
    supabase
      .from("content_items")
      .select(
        "id,title,caption,status,thumbnail,planned_publish_date,scheduled_at,updated_at,created_at,instagram_order,content_attachments(url,sort_order)",
      )
      .eq("client_id", preview.client_id)
      .in("platform", ["instagram", "ig"]),
  ])

  if (error) {
    return <main className="p-8 text-sm">Preview unavailable.</main>
  }

  const mapped = sortInstagramWallItems(((rows ?? []) as Row[]).map(mapPreviewRow))

  return (
    <main className="bg-background text-foreground min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="rounded-lg border border-border/70 px-4 py-3">
          <h1 className="text-base font-semibold">{client?.name ?? "Client"} Instagram Preview</h1>
          <p className="text-muted-foreground mt-1 text-xs">Latest planner wall · read only</p>
        </header>
        {mapped.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            此預覽目前沒有可顯示的 Instagram 內容。
          </div>
        ) : (
          <PreviewGridClient items={mapped} />
        )}
      </div>
    </main>
  )
}
