import { createHmac, timingSafeEqual } from "node:crypto"

import { createClient } from "@supabase/supabase-js"

import { fetchAsanaReadyItemByTaskId } from "@/lib/integrations/asana"
import { mapAsanaReadyToStoredContentItem } from "@/lib/content/store"

type AsanaEvent = {
  action?: string
  resource?: {
    gid?: string
    resource_type?: string
  }
  parent?: {
    gid?: string
    resource_type?: string
  }
}

function getWebhookProjectAllowlist() {
  const raw = process.env.ASANA_WEBHOOK_PROJECT_GID?.trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
}

function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for webhook.",
    )
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } })
}

function isRelevantTaskEvent(event: AsanaEvent) {
  if (event.resource?.resource_type !== "task") return false
  return ["added", "changed", "deleted"].includes(event.action ?? "")
}

function eventInAllowedProjects(event: AsanaEvent, allowlist: string[]) {
  if (allowlist.length === 0) return true
  const parentGid = event.parent?.gid
  if (!parentGid) return false
  return allowlist.includes(parentGid)
}

async function resolveClientIdFromName(clientValue: string) {
  const supabase = getServiceSupabaseClient()
  const trimmed = clientValue.trim()
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
  return trimmed
}

async function deleteAsanaTaskFromSupabase(asanaTaskId: string) {
  const supabase = getServiceSupabaseClient()
  const { data: existing } = await supabase
    .from("content_items")
    .select("id")
    .eq("source", "asana")
    .eq("source_task_gid", asanaTaskId)
    .maybeSingle()
  if (!existing?.id) return

  await supabase
    .from("content_attachments")
    .delete()
    .eq("content_item_id", existing.id)

  await supabase.from("content_items").delete().eq("id", existing.id)
}

async function upsertAsanaTaskToSupabase(asanaTaskId: string) {
  const ready = await fetchAsanaReadyItemByTaskId(asanaTaskId)
  // If task no longer satisfies ready rule, remove from queue/content store.
  if (!ready) {
    await deleteAsanaTaskFromSupabase(asanaTaskId)
    return
  }

  const incoming = mapAsanaReadyToStoredContentItem(ready)
  const clientId = await resolveClientIdFromName(incoming.client)
  const supabase = getServiceSupabaseClient()
  const { data: existing } = await supabase
    .from("content_items")
    .select("*")
    .eq("source", "asana")
    .eq("source_task_gid", asanaTaskId)
    .maybeSingle()

  const payload = {
    client_id: clientId,
    platform: incoming.platform,
    content_type: incoming.contentType,
    title: incoming.title,
    caption: incoming.caption,
    planned_publish_date: incoming.plannedPublishDate ?? null,
    status: existing?.status ?? incoming.status,
    source: "asana",
    source_task_gid: asanaTaskId,
    position: incoming.position ?? null,
    internal_notes: existing?.internal_notes ?? null,
  }

  if (existing) {
    const { data, error } = await supabase
      .from("content_items")
      .update(payload)
      .eq("id", existing.id)
      .select("id")
      .single()
    if (error) throw error
    await supabase.from("content_attachments").delete().eq("content_item_id", data.id)
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
    return
  }

  const { data, error } = await supabase
    .from("content_items")
    .insert(payload)
    .select("id")
    .single()
  if (error) throw error
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
}

export function verifyAsanaWebhookSignature({
  rawBody,
  signatureHeader,
  secret,
}: {
  rawBody: string
  signatureHeader: string
  secret: string
}) {
  const hmac = createHmac("sha256", secret).update(rawBody).digest()
  const sigHex = hmac.toString("hex")
  const sigBase64 = hmac.toString("base64")

  const provided = signatureHeader.trim()
  const candidates = [sigHex, sigBase64]
  for (const candidate of candidates) {
    const a = Buffer.from(candidate)
    const b = Buffer.from(provided)
    if (a.length !== b.length) continue
    if (timingSafeEqual(a, b)) return true
  }
  return false
}

export async function handleAsanaWebhookEvents(events: AsanaEvent[]): Promise<void> {
  const allowlist = getWebhookProjectAllowlist()
  const relevant = events.filter(
    (e) => isRelevantTaskEvent(e) && eventInAllowedProjects(e, allowlist),
  )
  if (relevant.length === 0) return

  for (const event of relevant) {
    const taskId = event.resource?.gid
    if (!taskId) continue
    try {
      if (event.action === "deleted") {
        await deleteAsanaTaskFromSupabase(taskId)
      } else {
        await upsertAsanaTaskToSupabase(taskId)
      }
    } catch (error) {
      console.error("[asana/webhook] event processing error", {
        taskId,
        action: event.action,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

