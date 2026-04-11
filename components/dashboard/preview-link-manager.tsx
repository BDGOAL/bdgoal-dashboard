"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

type PreviewRow = {
  id: string
  token: string
  client_id: string
  month_key: string
  view_type: "grid" | "calendar"
  expires_at: string | null
  revoked_at: string | null
}

type ClientRow = { id: string; name: string }

export function PreviewLinkManager() {
  const [clients, setClients] = React.useState<ClientRow[]>([])
  const [clientSource, setClientSource] = React.useState<"api" | "empty" | "error">("empty")
  const [clientId, setClientId] = React.useState("")
  const [monthKey, setMonthKey] = React.useState(new Date().toISOString().slice(0, 7))
  const [viewType, setViewType] = React.useState<"grid" | "calendar">("grid")
  const [rows, setRows] = React.useState<PreviewRow[]>([])
  const [msg, setMsg] = React.useState<string | null>(null)
  const [clientsLoading, setClientsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setClientsLoading(true)
        const res = await fetch("/api/clients", { cache: "no-store" })
        const json = (await res.json()) as {
          clients?: ClientRow[]
          error?: string
        }
        if (cancelled) return
        if (!res.ok) {
          console.error("[PreviewLinkManager] GET /api/clients failed:", res.status, json.error)
          setClients([])
          setClientSource("error")
          setClientId("")
          setMsg("無法載入客戶列表（請確認已登入且 API 正常），無法建立預覽連結。")
          return
        }
        const list = json.clients ?? []
        if (list.length === 0) {
          setClients([])
          setClientSource("empty")
          setClientId("")
          setMsg("目前沒有可存取的客戶，無法建立預覽連結。")
          return
        }
        setClients(list)
        setClientSource("api")
        setClientId((prev) => list.some((c) => c.id === prev) ? prev : list[0]!.id)
        setMsg(null)
      } catch (e) {
        if (cancelled) return
        console.error("[PreviewLinkManager] GET /api/clients error:", e)
        setClients([])
        setClientSource("error")
        setClientId("")
        setMsg("無法連線取得客戶列表，請檢查網路後重新整理。")
      } finally {
        if (!cancelled) setClientsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
    if (!clientId.trim()) {
      setMsg("請先選擇客戶。")
      return
    }
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString()
    const res = await fetch("/api/preview-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, monthKey, viewType, expiresAt }),
    })
    const json = await res.json()
    if (!res.ok) {
      console.error("[PreviewLinkManager] create preview link failed:", json)
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
      {clientsLoading ? (
        <p className="text-muted-foreground mt-2 text-xs">載入客戶列表…</p>
      ) : null}
      {clientSource === "error" ? (
        <p className="text-destructive mt-2 text-xs leading-snug">
          客戶列表載入失敗，請確認登入狀態後重新整理。
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <select
          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={clientsLoading || clients.length === 0}
          aria-label="選擇客戶"
        >
          {clients.length === 0 ? (
            <option value="">—</option>
          ) : (
            clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
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
        <Button
          type="button"
          size="sm"
          onClick={() => void createLink()}
          disabled={clientsLoading || clients.length === 0 || !clientId}
        >
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
