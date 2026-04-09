import { createSupabaseServerClient } from "@/lib/supabase/server"

export type AppRole = "admin" | "editor" | "viewer"
export type ClientRole = "admin" | "editor" | "viewer" | "client_viewer"

export type PermissionContext = {
  userId: string
  appRole: AppRole
  allowedClientIds: string[]
  editableClientIds: string[]
}

export async function getPermissionContext(): Promise<PermissionContext | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const appRole = (profile?.role ?? "viewer") as AppRole

  const { data: memberships } = await supabase
    .from("client_memberships")
    .select("client_id, role")
    .eq("user_id", user.id)

  const allowedClientIds = Array.from(
    new Set((memberships ?? []).map((m) => m.client_id).filter(Boolean)),
  )
  const editableClientIds = Array.from(
    new Set(
      (memberships ?? [])
        .filter((m) => m.role === "admin" || m.role === "editor")
        .map((m) => m.client_id),
    ),
  )

  return {
    userId: user.id,
    appRole,
    allowedClientIds,
    editableClientIds,
  }
}

export function canEditClient(ctx: PermissionContext, clientId: string): boolean {
  if (ctx.appRole === "admin") return true
  return ctx.editableClientIds.includes(clientId)
}

export function canViewClient(ctx: PermissionContext, clientId: string): boolean {
  if (ctx.appRole === "admin") return true
  return ctx.allowedClientIds.includes(clientId)
}

