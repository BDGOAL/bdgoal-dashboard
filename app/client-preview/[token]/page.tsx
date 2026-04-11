import { notFound } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPreviewByToken } from "@/lib/repositories/preview-repository"

function inMonth(iso: string | null, monthKey: string) {
  if (!iso) return false
  try {
    return new Date(iso).toISOString().slice(0, 7) === monthKey
  } catch {
    return false
  }
}

export default async function ClientPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const token = (await params).token
  const preview = await getPreviewByToken(token)
  if (!preview) return notFound()
  if (preview.expires_at && new Date(preview.expires_at) < new Date()) {
    return <main className="p-8 text-sm">此預覽連結已過期。</main>
  }

  const supabase = await createSupabaseServerClient()
  const { data: client } = await supabase
    .from("clients")
    .select("id,name")
    .eq("id", preview.client_id)
    .maybeSingle()
  const { data: rows } = await supabase
    .from("content_items")
    .select("id,title,caption,planned_publish_date,status,thumbnail")
    .eq("client_id", preview.client_id)
    .eq("platform", "instagram")
    .order("planned_publish_date", { ascending: false })

  const items = (rows ?? []).filter((r) => inMonth(r.planned_publish_date, preview.month_key))

  return (
    <main className="bg-background text-foreground min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-lg border p-4">
          <h1 className="text-lg font-semibold">{client?.name ?? "Client"} 預覽</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {preview.month_key} · {preview.view_type === "grid" ? "Instagram Grid" : "月排程"}
          </p>
        </header>

        {preview.view_type === "grid" ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-md border">
                <div className="bg-muted aspect-square overflow-hidden">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
                      No Image
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-2 text-xs">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground line-clamp-2">{item.caption}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">{item.planned_publish_date ?? "—"}</p>
                <p className="text-muted-foreground mt-1 text-xs line-clamp-3">{item.caption}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

