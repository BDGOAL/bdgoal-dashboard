"use client"

import * as React from "react"

import { ListSyncStatus } from "@/components/dashboard/async-feedback"
import { InstagramAddPostDialog } from "@/components/instagram/instagram-add-post-dialog"
import { InstagramClientBar } from "@/components/instagram/instagram-client-bar"
import { InstagramCalendarView } from "@/components/instagram/instagram-calendar-view"
import { InstagramGridView } from "@/components/instagram/instagram-grid-view"
import { InstagramPostDetailsPanel } from "@/components/instagram/instagram-post-details-panel"
import {
  InstagramViewSwitcher,
  type InstagramMainView,
} from "@/components/instagram/instagram-view-switcher"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import type { ContentItem } from "@/lib/types/dashboard"
import { fetchDashboardContentItems } from "@/lib/dashboard/fetch-dashboard-content-items-client"
import { filterByPlatform } from "@/lib/instagram/content-helpers"
import {
  filterInstagramItemsForClient,
  isInstagramClientScope,
} from "@/lib/instagram/instagram-scope"
import {
  contentItemStatusToApi,
  isInstagramPersistableItem,
  isPersistableContentItemId,
  persistInstagramPlannedDateChange,
} from "@/lib/instagram/instagram-ui-persistence"
import { sortInstagramWallItems } from "@/lib/instagram/instagram-wall-sort"
import { compressFilesForPlannerUpload } from "@/lib/instagram/instagram-image-upload-client"
import { uploadContentItemAttachmentsSequential } from "@/lib/instagram/instagram-compose-upload"
import { FEEDBACK_COPY } from "@/components/dashboard/async-feedback"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ImageIcon, Loader2 } from "lucide-react"

function plannerPlaceholderItem(
  id: string,
  clientId: string,
  title: string,
  caption: string,
): ContentItem {
  const brandId = `br-${clientId}`
  return {
    id,
    source: "manual",
    title,
    caption,
    platform: "instagram",
    postType: "feed",
    status: "published",
    scheduledAt: null,
    publishedAt: null,
    plannedPublishDate: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    tags: [],
    thumbnail: null,
    author: "手動",
    clientId,
    brandId,
    accountId: `acc-${clientId}-instagram`,
    instagramOrder: null,
    attachments: [],
  }
}

function reorderRowsByIds(rows: ContentItem[], orderedIds: string[]): ContentItem[] {
  const m = new Map(rows.map((i) => [i.id, i]))
  return orderedIds.map((id) => m.get(id)).filter(Boolean) as ContentItem[]
}

function applyInstagramOrderLocally(rows: ContentItem[], orderedIds: string[]): ContentItem[] {
  const ordered = reorderRowsByIds(rows, orderedIds)
  return ordered.map((row, index) => ({
    ...row,
    // 可見位置（row-major）直接映射到持久欄位：左上 = 0，往右遞增，換行後續增。
    instagramOrder: index,
  }))
}

type BgUploadState =
  | {
      kind: "working"
      itemId: string
      message: string
    }
  | {
      kind: "error"
      itemId: string
      files: File[]
      error: string
      uploadFailedIndices: number[] | null
    }

type PreviewLinkState =
  | { loading: true; url: string | null }
  | { loading: false; url: string | null }

export function InstagramManager({ items }: { items: ContentItem[] }) {
  const { scope } = useWorkspaceScope()
  const clientOk = isInstagramClientScope(scope)
  const selectedClientId = clientOk ? scope.clientId : null

  const [apiClientName, setApiClientName] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!clientOk) {
      setApiClientName(null)
      return
    }
    let cancelled = false
    fetch("/api/clients", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as {
          clients?: { id: string; name: string }[]
        }
        if (!res.ok) return null
        return json.clients?.find((c) => c.id === selectedClientId)?.name ?? null
      })
      .then((name) => {
        if (!cancelled) setApiClientName(name)
      })
      .catch(() => {
        if (!cancelled) setApiClientName(null)
      })
    return () => {
      cancelled = true
    }
  }, [clientOk, selectedClientId])

  const filteredItems = React.useMemo(() => {
    if (!clientOk || !selectedClientId) return []
    const raw = filterInstagramItemsForClient(items, selectedClientId)
    return sortInstagramWallItems(raw)
  }, [items, clientOk, selectedClientId])

  const resolvedClientLabel = React.useMemo(() => {
    if (!clientOk || !selectedClientId) return null
    const fromItem = filteredItems[0]?.clientName?.trim()
    if (fromItem) return fromItem
    const fromApi = apiClientName?.trim()
    if (fromApi) return fromApi
    return `客戶 ${selectedClientId.slice(0, 8)}…`
  }, [apiClientName, clientOk, filteredItems, selectedClientId])

  const [mainView, setMainView] = React.useState<InstagramMainView>("grid")
  const [loading, setLoading] = React.useState(false)
  const [detailsItem, setDetailsItem] = React.useState<ContentItem | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const [rows, setRows] = React.useState(filteredItems)
  const [reorderError, setReorderError] = React.useState<string | null>(null)
  const [bgUpload, setBgUpload] = React.useState<BgUploadState | null>(null)
  const [previewLink, setPreviewLink] = React.useState<PreviewLinkState>({
    loading: false,
    url: null,
  })
  const pendingOrderIdsRef = React.useRef<string[] | null>(null)

  React.useEffect(() => {
    setRows(filteredItems)
  }, [filteredItems])

  const refreshChainRef = React.useRef(Promise.resolve())

  function refreshRows() {
    const next = refreshChainRef.current.then(async () => {
      setLoading(true)
      try {
        const all = await fetchDashboardContentItems()
        if (all) {
          if (!isInstagramClientScope(scope) || !selectedClientId) {
            setRows([])
            return
          }
          const raw = filterInstagramItemsForClient(all, selectedClientId)
          const sorted = sortInstagramWallItems(raw)
          const pendingIds = pendingOrderIdsRef.current
          if (pendingIds && pendingIds.length === sorted.length) {
            const sortedIdSet = new Set(sorted.map((r) => r.id))
            const allMatch = pendingIds.every((id) => sortedIdSet.has(id))
            const merged = allMatch ? applyInstagramOrderLocally(sorted, pendingIds) : sorted
            if (allMatch) {
              const persistedIds = sortInstagramWallItems(sorted).map((r) => r.id)
              const pendingKey = pendingIds.join("|")
              const persistedKey = persistedIds.join("|")
              if (pendingKey === persistedKey) {
                pendingOrderIdsRef.current = null
              }
            }
            setRows(merged)
          } else {
            setRows(sorted)
          }
        } else {
          throw new Error(
            "\u7121\u6cd5\u8207\u4f3a\u670d\u5668\u540c\u6b65\u5217\u8868\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002",
          )
        }
      } finally {
        setLoading(false)
      }
    })
    refreshChainRef.current = next.catch(() => {})
    return next
  }

  function openDetails(item: ContentItem) {
    setDetailsItem(item)
    setDetailsOpen(true)
  }

  async function loadPreviewLink() {
    if (!clientOk || !selectedClientId) {
      setPreviewLink({ loading: false, url: null })
      return
    }
    setPreviewLink((s) => ({ ...s, loading: true }))
    try {
      const res = await fetch(
        `/api/preview-links?mode=instagram_latest&clientId=${encodeURIComponent(selectedClientId)}`,
        { cache: "no-store" },
      )
      const json = (await res.json()) as {
        rows?: Array<{ token: string }>
        error?: string
      }
      if (!res.ok) throw new Error(json.error ?? "讀取預覽連結失敗。")
      const token = json.rows?.[0]?.token
      setPreviewLink({
        loading: false,
        url: token ? `${window.location.origin}/preview/instagram/${token}` : null,
      })
    } catch {
      setPreviewLink({ loading: false, url: null })
    }
  }

  React.useEffect(() => {
    void loadPreviewLink()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientOk, selectedClientId])

  async function ensurePreviewLink(regenerate = false) {
    if (!clientOk || !selectedClientId) return
    setPreviewLink((s) => ({ ...s, loading: true }))
    try {
      const res = await fetch("/api/preview-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "instagram_latest",
          clientId: selectedClientId,
          regenerate,
        }),
      })
      const json = (await res.json()) as {
        row?: { token: string }
        error?: string
      }
      if (!res.ok || !json.row?.token) throw new Error(json.error ?? "建立預覽連結失敗。")
      const url = `${window.location.origin}/preview/instagram/${json.row.token}`
      await navigator.clipboard.writeText(url)
      setPreviewLink({ loading: false, url })
    } catch (e) {
      setPreviewLink((s) => ({ ...s, loading: false }))
      setReorderError(e instanceof Error ? e.message : "建立預覽連結失敗。")
    }
  }

  async function disablePreviewLink() {
    if (!clientOk || !selectedClientId || !previewLink.url) return
    try {
      const token = previewLink.url.split("/").pop()
      const listRes = await fetch(
        `/api/preview-links?mode=instagram_latest&clientId=${encodeURIComponent(selectedClientId)}`,
        { cache: "no-store" },
      )
      const listJson = (await listRes.json()) as {
        rows?: Array<{ id: string; token: string }>
      }
      const row = listJson.rows?.find((r) => r.token === token) ?? listJson.rows?.[0]
      if (!row) return
      await fetch("/api/preview-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      })
      setPreviewLink({ loading: false, url: null })
    } catch {
      /* ignore */
    }
  }

  async function handleWallOrderCommit(orderedIds: string[]) {
    if (!clientOk || !selectedClientId) return
    if (!orderedIds.every((id) => isPersistableContentItemId(id))) {
      setReorderError("含無法寫入的示範項目，已略過排序同步。")
      return
    }
    setReorderError(null)
    pendingOrderIdsRef.current = orderedIds
    let snapshot: ContentItem[] = []
    setRows((prev) => {
      snapshot = prev
      return applyInstagramOrderLocally(prev, orderedIds)
    })
    try {
      const res = await fetch("/api/content/items/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, orderedIds }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? "排序更新失敗。")
      }
      // API 成功後維持目前本地順序，直到下一次伺服器回傳同序資料覆蓋。
      pendingOrderIdsRef.current = orderedIds
    } catch (e) {
      pendingOrderIdsRef.current = null
      setRows(snapshot)
      const msg = e instanceof Error ? e.message : "排序更新失敗。"
      setReorderError(msg)
    }
  }

  function handleCalendarReschedule(prev: ContentItem, next: ContentItem) {
    setRows((r) => r.map((i) => (i.id === next.id ? next : i)))
    if (!isInstagramPersistableItem(prev)) return
    void (async () => {
      const apiStatus = contentItemStatusToApi(next.status)
      const iso = next.plannedPublishDate ?? null
      const result = await persistInstagramPlannedDateChange({
        item: prev,
        plannedPublishDateIso: iso,
        apiStatus,
      })
      if (!result.ok) await refreshRows()
    })()
  }

  async function runBackgroundUpload(itemId: string, files: File[]) {
    setBgUpload({ kind: "working", itemId, message: FEEDBACK_COPY.plannerBackgroundUpload })
    try {
      const compressed = await compressFilesForPlannerUpload(files)
      const batch = await uploadContentItemAttachmentsSequential(itemId, compressed)
      if (!batch.ok) {
        if (batch.kind === "network") {
          setBgUpload({
            kind: "error",
            itemId,
            files: compressed,
            error: batch.error,
            uploadFailedIndices: batch.retryIndices,
          })
        } else {
          setBgUpload({
            kind: "error",
            itemId,
            files: compressed,
            error: batch.failures.map((f) => f.error).join("；") || "部分圖片未上傳。",
            uploadFailedIndices: batch.failures.map((f) => f.index),
          })
        }
        await refreshRows()
        return
      }
      setBgUpload(null)
      await refreshRows()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "上傳失敗。"
      setBgUpload({
        kind: "error",
        itemId,
        files,
        error: msg,
        uploadFailedIndices: null,
      })
      await refreshRows()
    }
  }

  function handlePostCreated(payload: {
    id: string
    title: string
    caption: string
    files: File[]
  }) {
    if (!clientOk || !selectedClientId) return
    const ph = plannerPlaceholderItem(payload.id, selectedClientId, payload.title, payload.caption)
    setRows((prev) => {
      const rest = prev.filter((i) => i.id !== ph.id)
      return [ph, ...rest]
    })
    void refreshRows()
    if (payload.files.length > 0) {
      void runBackgroundUpload(payload.id, payload.files)
    }
  }

  async function retryBackgroundUpload() {
    if (!bgUpload || bgUpload.kind !== "error") return
    const { itemId, files, uploadFailedIndices } = bgUpload
    setBgUpload({ kind: "working", itemId, message: FEEDBACK_COPY.plannerBackgroundUpload })
    try {
      const indices =
        uploadFailedIndices?.length && uploadFailedIndices.length < files.length
          ? uploadFailedIndices
          : files.map((_, i) => i)
      const batch = await uploadContentItemAttachmentsSequential(itemId, files, { indices })
      if (!batch.ok) {
        if (batch.kind === "network") {
          setBgUpload({
            kind: "error",
            itemId,
            files,
            error: batch.error,
            uploadFailedIndices: batch.retryIndices,
          })
        } else {
          setBgUpload({
            kind: "error",
            itemId,
            files,
            error: "仍有圖片未上傳，請再試。",
            uploadFailedIndices: batch.failures.map((f) => f.index),
          })
        }
        await refreshRows()
        return
      }
      setBgUpload(null)
      await refreshRows()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "上傳失敗。"
      setBgUpload({
        kind: "error",
        itemId,
        files,
        error: msg,
        uploadFailedIndices: null,
      })
    }
  }

  async function handleBulkDelete(ids: string[]) {
    if (!ids.length) return
    const snapshot = rows
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)))
    try {
      for (const id of ids) {
        const res = await fetch(`/api/content/items/${encodeURIComponent(id)}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(json.error ?? "刪除失敗。")
        }
      }
      await refreshRows()
    } catch (e) {
      setRows(snapshot)
      setReorderError(e instanceof Error ? e.message : "批次刪除失敗。")
    }
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      {loading ? <ListSyncStatus /> : null}

      <InstagramClientBar clientName={resolvedClientLabel} />

      {bgUpload ? (
        <div
          role="status"
          className="text-muted-foreground flex flex-wrap items-center gap-2 rounded-md border border-border/50 bg-muted/15 px-3 py-2 text-xs"
        >
          {bgUpload.kind === "working" ? (
            <>
              <Loader2 className="size-3.5 shrink-0 animate-spin opacity-90" aria-hidden />
              <span>{bgUpload.message}</span>
            </>
          ) : (
            <>
              <span className="text-destructive">{bgUpload.error}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void retryBackgroundUpload()}>
                重試上傳
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setBgUpload(null)}>
                關閉
              </Button>
            </>
          )}
        </div>
      ) : null}

      {reorderError ? (
        <p className="text-destructive text-xs" role="alert">
          {reorderError}（已還原順序，請稍後再試。）
        </p>
      ) : null}

      {!clientOk ? (
        <EmptyState
          icon={ImageIcon}
          title="請選擇客戶"
          reason="預覽牆與月曆僅顯示單一客戶。"
          suggestion="請在右上角選擇客戶。"
        />
      ) : (
        <>
          <div
            className={cn(
              "flex min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
            )}
          >
            <div className="min-w-0 shrink">
              <InstagramViewSwitcher value={mainView} onValueChange={setMainView} />
            </div>
            <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!clientOk || previewLink.loading}
                onClick={() => void ensurePreviewLink(false)}
              >
                Share Preview
              </Button>
              {previewLink.url ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!clientOk || previewLink.loading}
                    onClick={() => void ensurePreviewLink(true)}
                  >
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={!clientOk || previewLink.loading}
                    onClick={() => void disablePreviewLink()}
                  >
                    Disable
                  </Button>
                </>
              ) : null}
              <InstagramAddPostDialog
                onPostCreated={handlePostCreated}
                workspaceContentItems={filterByPlatform(items, "instagram")}
                apiClientName={apiClientName}
              />
            </div>
          </div>
          {previewLink.url ? (
            <p className="text-muted-foreground text-xs">
              Preview link:{" "}
              <a className="underline underline-offset-2" href={previewLink.url} target="_blank" rel="noreferrer">
                {previewLink.url}
              </a>
            </p>
          ) : null}

          <div
            className={cn(
              "min-w-0 max-w-full transition-opacity duration-200 ease-out",
              loading && "pointer-events-none opacity-[0.72]",
            )}
            aria-busy={loading}
          >
            {mainView === "grid" ? (
              <InstagramGridView
                items={rows}
                clientDisplayName={resolvedClientLabel ?? "此客戶"}
                onRequestDetails={openDetails}
                onWallOrderCommit={handleWallOrderCommit}
                onBulkDelete={handleBulkDelete}
              />
            ) : (
              <InstagramCalendarView
                items={rows}
                clientDisplayName={resolvedClientLabel ?? "此客戶"}
                onRequestDetails={openDetails}
                onRescheduleItem={handleCalendarReschedule}
              />
            )}
          </div>
        </>
      )}

      <InstagramPostDetailsPanel
        item={detailsItem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onSaved={() => refreshRows()}
      />
    </div>
  )
}
