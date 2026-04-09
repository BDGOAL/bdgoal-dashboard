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

