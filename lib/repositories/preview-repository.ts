import { createSupabaseServerClient } from "@/lib/supabase/server"

export type PreviewViewType = "grid" | "calendar"

export async function createPreviewLink(params: {
  clientId: string
  monthKey: string
  viewType: PreviewViewType
  expiresAt: string
  createdBy: string
}) {
  const supabase = await createSupabaseServerClient()
  const token = crypto.randomUUID().replaceAll("-", "")
  const { data, error } = await supabase
    .from("preview_links")
    .insert({
      token,
      client_id: params.clientId,
      month_key: params.monthKey,
      view_type: params.viewType,
      expires_at: params.expiresAt,
      created_by: params.createdBy,
    })
    .select("*")
    .single()
  if (error) throw new Error(`建立預覽連結失敗：${error.message}`)
  return data
}

export async function revokePreviewLink(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("preview_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw new Error(`撤銷預覽連結失敗：${error.message}`)
}

export async function findActiveInstagramPreviewLink(clientId: string) {
  const supabase = await createSupabaseServerClient()
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("preview_links")
    .select("*")
    .eq("client_id", clientId)
    .eq("view_type", "grid")
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`讀取預覽連結失敗：${error.message}`)
  return data
}

export async function revokeActiveInstagramPreviewLinks(clientId: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("preview_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("view_type", "grid")
    .is("revoked_at", null)
  if (error) throw new Error(`撤銷現有 Instagram 預覽連結失敗：${error.message}`)
}

export async function getPreviewByToken(token: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("preview_links")
    .select("*")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle()
  if (error) throw new Error(`讀取預覽連結失敗：${error.message}`)
  return data
}

