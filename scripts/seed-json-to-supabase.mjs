#!/usr/bin/env node
import fs from "node:fs/promises"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } })
const filePath = path.join(process.cwd(), "data", "content-store.json")
const raw = await fs.readFile(filePath, "utf-8")
const json = JSON.parse(raw)
const items = Array.isArray(json.items) ? json.items : []

for (const item of items) {
  const payload = {
    client_id: item.client,
    platform: item.platform,
    content_type: item.contentType,
    title: item.title,
    caption: item.caption ?? "",
    planned_publish_date: item.plannedPublishDate ?? null,
    status: item.status ?? "planning",
    source: item.source ?? "manual",
    source_task_gid: item.sourceRef?.asanaTaskId ?? null,
    position: item.position ?? null,
    thumbnail: null,
    internal_notes: item.localNotes ?? null,
  }
  const { data, error } = await supabase
    .from("content_items")
    .upsert(payload)
    .select("id")
    .single()
  if (error) {
    console.error("Failed upsert:", item.title, error.message)
    continue
  }
  if (Array.isArray(item.attachments) && item.attachments.length > 0) {
    await supabase.from("content_attachments").delete().eq("content_item_id", data.id)
    await supabase.from("content_attachments").insert(
      item.attachments.map((a, idx) => ({
        content_item_id: data.id,
        url: a.url,
        type: a.name ?? "asset",
        sort_order: idx,
      })),
    )
  }
}

console.log(`Seeded ${items.length} items.`)

