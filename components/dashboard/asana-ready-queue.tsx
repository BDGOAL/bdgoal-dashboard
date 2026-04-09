"use client"

import * as React from "react"

import { type AsanaReadyItem } from "@/lib/integrations/asana-normalize"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/dashboard/empty-state"

type ReadyQueueResponse = {
  source: "asana"
  count: number
  items: AsanaReadyItem[]
  importedMap?: Record<string, { id: string; updatedAt: string }>
  error?: string
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function previewCaption(value: string | null): string {
  if (!value) return "—"
  const text = value.trim()
  if (text.length <= 72) return text
  return `${text.slice(0, 71)}…`
}

export function AsanaReadyQueue() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [items, setItems] = React.useState<AsanaReadyItem[]>([])
  const [importingId, setImportingId] = React.useState<string | null>(null)
  const [importedMap, setImportedMap] = React.useState<
    Record<string, { id: string; updatedAt: string }>
  >({})
  const [importedIds, setImportedIds] = React.useState<Set<string>>(new Set())

  const loadQueue = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/asana/ready-queue", { cache: "no-store" })
      const json = (await res.json()) as ReadyQueueResponse
      if (!res.ok) {
        setItems([])
        setError(json.error ?? "無法讀取 Asana Ready Queue。")
        return
      }
      setActionError(null)
      setItems(json.items ?? [])
      setImportedMap(json.importedMap ?? {})
    } catch {
      setItems([])
      setError("Asana 連線失敗，請稍後再試。")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  async function importItem(item: AsanaReadyItem) {
    setActionError(null)
    setImportingId(item.asanaTaskId)
    try {
      const res = await fetch("/api/content/import-from-asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asanaTaskId: item.asanaTaskId }),
      })
      const json = (await res.json()) as {
        error?: string
        outcome?: "created" | "updated"
        id?: string
        updatedAt?: string
      }
      if (!res.ok) {
        setActionError(json.error ?? "匯入失敗，請稍後再試。")
        return
      }
      setImportedIds((prev) => new Set(prev).add(item.asanaTaskId))
      setImportedMap((prev) => ({
        ...prev,
        [item.asanaTaskId]: {
          id: json.id ?? prev[item.asanaTaskId]?.id ?? "",
          updatedAt:
            json.updatedAt ?? prev[item.asanaTaskId]?.updatedAt ?? new Date().toISOString(),
        },
      }))
    } catch {
      setActionError("匯入失敗，請稍後再試。")
    } finally {
      setImportingId(null)
    }
  }

  return (
    <Card size="sm" className="ring-foreground/8 shadow-none">
      <CardHeader className="border-border/50 border-b pb-3">
        <CardTitle className="text-sm font-semibold">Asana Ready Queue</CardTitle>
        <p className="text-muted-foreground text-xs">
          僅顯示符合 Ready-to-sync 規則的主任務；來源為 Asana（伺服器端讀取）。
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-3">
        <div className="flex items-center justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => void loadQueue()}>
            重新整理
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">載入 Asana Ready Queue 中…</p>
        ) : null}

        {!loading && error ? (
          <EmptyState
            title="無法載入 Asana Ready Queue"
            reason={error}
            suggestion="確認 ASANA_PAT / ASANA_PROJECT_GID 是否已設定，並檢查專案權限。"
          />
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <EmptyState
            title="目前沒有可匯入的項目"
            reason="Asana 主任務尚未同時滿足 Ready to Sync、Final 狀態與附件條件。"
            suggestion="請在 Asana 補齊必要欄位與主附件後，再按「重新整理」。"
          />
        ) : null}

        {actionError ? (
          <p className="text-destructive text-xs">{actionError}</p>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead>
                <tr className="bg-muted/30 border-b text-[11px]">
                  <th className="px-3 py-2 font-medium">標題</th>
                  <th className="px-2 py-2 font-medium">客戶</th>
                  <th className="px-2 py-2 font-medium">平台</th>
                  <th className="px-2 py-2 font-medium">內容類型</th>
                  <th className="px-2 py-2 font-medium">Position</th>
                  <th className="px-2 py-2 font-medium">預計發佈</th>
                  <th className="px-2 py-2 font-medium">Final Caption</th>
                  <th className="px-2 py-2 font-medium tabular-nums">附件</th>
                  <th className="px-2 py-2 font-medium">狀態</th>
                  <th className="px-3 py-2 font-medium text-right">動作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const imported = importedMap[item.asanaTaskId]
                  const isImported = Boolean(imported) || importedIds.has(item.asanaTaskId)
                  return (
                    <tr
                      key={item.asanaTaskId}
                      className="border-border/40 hover:bg-muted/20 border-b last:border-0"
                    >
                      <td className="text-foreground max-w-[240px] truncate px-3 py-2 font-medium">
                        {item.title}
                      </td>
                      <td className="text-muted-foreground px-2 py-2">{item.client ?? "—"}</td>
                      <td className="text-muted-foreground px-2 py-2">{item.platform ?? "—"}</td>
                      <td className="text-muted-foreground px-2 py-2">
                        {item.contentType ?? "—"}
                      </td>
                      <td className="text-muted-foreground px-2 py-2">{item.position ?? "—"}</td>
                      <td className="text-muted-foreground px-2 py-2 tabular-nums">
                        {formatDate(item.plannedPublishDate)}
                      </td>
                      <td className="text-muted-foreground max-w-[260px] truncate px-2 py-2">
                        {previewCaption(item.finalCaption)}
                      </td>
                      <td className="text-foreground px-2 py-2 tabular-nums">
                        {item.attachments.length}
                      </td>
                      <td className="px-2 py-2">
                        {isImported ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] text-foreground">
                              已在 Dashboard
                            </span>
                            {imported?.updatedAt ? (
                              <span className="text-muted-foreground text-[10px]">
                                更新於 {formatDate(imported.updatedAt)}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">未匯入</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={isImported ? "secondary" : "outline"}
                          disabled={importingId === item.asanaTaskId}
                          onClick={() => void importItem(item)}
                        >
                          {importingId === item.asanaTaskId
                            ? "處理中..."
                            : isImported
                              ? "Update from Asana"
                              : "Import to schedule"}
                        </Button>
                        {imported?.id ? (
                          <a
                            href="/instagram"
                            className="text-muted-foreground ml-2 text-[10px] underline-offset-2 hover:underline"
                          >
                            Open in dashboard
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {Object.keys(importedMap).length > 0 ? (
          <p className="text-muted-foreground text-xs">
            已在 Dashboard 內存在 {Object.keys(importedMap).length} 筆 Asana 匯入內容。
          </p>
        ) : importedIds.size > 0 ? (
          <p className="text-muted-foreground text-xs">
            已成功匯入 {importedIds.size} 筆內容，可到 Instagram 與行事曆檢視。
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
