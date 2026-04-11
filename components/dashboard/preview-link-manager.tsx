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
  const [clientSource, setClientSource] = React.useState<"api" | "mock_fallback" | "empty">(
    "empty",
  )
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
          const { mockClients } = await import("@/lib/mock/agency")
          const fallback = mockClients.map((c) => ({ id: c.id, name: c.name }))
          console.error(
            "[PreviewLinkManager] Using mock agency clients as fallback (see lib/mock/agency).",
          )
          setClients(fallback)
          setClientSource("mock_fallback")
          setClientId(fallback[0]?.id ?? "")
          setMsg(
            "無法載入真實客戶列表，已改用示範用客戶 id（僅供離線／開發）；正式環境請確認登入與 API。",
          )
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
        const { mockClients } = await import("@/lib/mock/agency")
        const fallback = mockClients.map((c) => ({ id: c.id, name: c.name }))
        console.error(
          "[PreviewLinkManager] Using mock agency clients as fallback after network error.",
        )
        setClients(fallback)
        setClientSource("mock_fallback")
        setClientId(fallback[0]?.id ?? "")
        setMsg(
          "無法連線取得客戶列表，已改用示範資料；請檢查網路後重新整理。",
        )
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
      {clientSource === "mock_fallback" ? (
        <p className="text-amber-600/90 dark:text-amber-400/90 mt-2 text-xs leading-snug">
          示範用客戶 id：請勿與正式 DB 客戶混用；修復連線後重新整理改為真實列表。
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
                {clientSource === "mock_fallback" ? `[示範] ${c.name}` : c.name}
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
