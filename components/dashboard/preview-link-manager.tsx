"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { mockClients } from "@/lib/mock/agency"

type PreviewRow = {
  id: string
  token: string
  client_id: string
  month_key: string
  view_type: "grid" | "calendar"
  expires_at: string | null
  revoked_at: string | null
}

export function PreviewLinkManager() {
  const [clientId, setClientId] = React.useState(mockClients[0]?.id ?? "")
  const [monthKey, setMonthKey] = React.useState(new Date().toISOString().slice(0, 7))
  const [viewType, setViewType] = React.useState<"grid" | "calendar">("grid")
  const [rows, setRows] = React.useState<PreviewRow[]>([])
  const [msg, setMsg] = React.useState<string | null>(null)

  async function load() {
    const res = await fetch("/api/preview-links", { cache: "no-store" })
    const json = await res.json()
    if (res.ok) setRows(json.rows ?? [])
  }

  React.useEffect(() => {
    void load()
  }, [])

  async function createLink() {
    setMsg(null)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
    const res = await fetch("/api/preview-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, monthKey, viewType, expiresAt }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.error ?? "建立失敗")
      return
    }
    const url = `${window.location.origin}/client-preview/${json.row.token}`
    await navigator.clipboard.writeText(url)
    setMsg("已建立並複製連結")
    await load()
  }

  async function revoke(id: string) {
    await fetch("/api/preview-links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    await load()
  }

  return (
    <section className="rounded-lg border p-3">
      <h3 className="text-sm font-semibold">Client Preview Links</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <select
          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          {mockClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
        />
        <select
          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
          value={viewType}
          onChange={(e) => setViewType(e.target.value as "grid" | "calendar")}
        >
          <option value="grid">Grid</option>
          <option value="calendar">Calendar</option>
        </select>
        <Button type="button" size="sm" onClick={() => void createLink()}>
          建立並複製
        </Button>
      </div>
      {msg ? <p className="text-muted-foreground mt-2 text-xs">{msg}</p> : null}
      <ul className="mt-3 space-y-1 text-xs">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5">
            <span className="truncate">
              {r.client_id} · {r.month_key} · {r.view_type} ·{" "}
              {r.revoked_at ? "revoked" : "active"}
            </span>
            {!r.revoked_at ? (
              <Button type="button" size="xs" variant="outline" onClick={() => void revoke(r.id)}>
                revoke
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

