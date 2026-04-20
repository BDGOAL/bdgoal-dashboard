export type UploadContentAttachmentResult =
  | { ok: true; url: string; attachmentId: string }
  | { ok: false; error: string; kind: "network" | "api" }

type AttachmentErrorJson = {
  error?: string
  code?: string
  step?: string
  detail?: string
  warning?: { step?: string; code?: string; message?: string }
}

function formatApiError(res: Response, json: AttachmentErrorJson): string {
  const parts = [
    json.error,
    json.step ? `步驟：${json.step}` : null,
    json.code ? `代碼：${json.code}` : null,
    json.detail && json.detail !== json.error ? `詳情：${json.detail}` : null,
  ].filter(Boolean)
  if (parts.length) return parts.join(" · ")
  const hint = res.statusText?.trim()
  return hint
    ? `上傳失敗（HTTP ${res.status} ${hint}）。`
    : `上傳失敗（HTTP ${res.status}）。`
}

/**
 * Uploads an image for an existing content item (after POST /api/content/items).
 * Uses multipart POST to `/api/content/items/[id]/attachments`.
 *
 * - `kind: "network"`：**僅在** `fetch` 拋錯（無 HTTP 回應）時回傳。
 * - `kind: "api"`：已收到回應（含 4xx/5xx）或 body 無法解析。
 */
export async function uploadInstagramComposeMedia(
  contentItemId: string,
  file: File,
  options?: { typeLabel?: string },
): Promise<UploadContentAttachmentResult> {
  const id = contentItemId.trim()
  if (!id) return { ok: false, error: "缺少內容項目 id。", kind: "api" }

  const fd = new FormData()
  fd.set("file", file)
  if (options?.typeLabel?.trim()) {
    fd.set("type", options.typeLabel.trim())
  }

  let res: Response
  try {
    res = await fetch(`/api/content/items/${encodeURIComponent(id)}/attachments`, {
      method: "POST",
      body: fd,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "連線中斷"
    return {
      ok: false,
      error: `無法連上伺服器：${msg}。請確認網路或稍後再試。`,
      kind: "network",
    }
  }

  const text = await res.text()
  let json: AttachmentErrorJson & {
    ok?: boolean
    attachment?: { id: string; url: string }
    url?: string
  } = {}

  if (text) {
    try {
      json = JSON.parse(text) as typeof json
    } catch {
      return {
        ok: false,
        error: `伺服器回應無法解析（${res.status}）：${text.slice(0, 200).trim()}`,
        kind: "api",
      }
    }
  } else if (!res.ok) {
    return {
      ok: false,
      error: formatApiError(res, json),
      kind: "api",
    }
  }

  if (!res.ok) {
    return { ok: false, error: formatApiError(res, json), kind: "api" }
  }

  const url = json.attachment?.url ?? json.url
  const attachmentId = json.attachment?.id
  if (!url || !attachmentId) {
    return { ok: false, error: "伺服器回應缺少附件資訊。", kind: "api" }
  }

  return { ok: true, url, attachmentId }
}

export type SequentialUploadFailure = {
  index: number
  fileName: string
  error: string
}

export type UploadContentItemAttachmentsSequentialResult =
  | { ok: true }
  | {
      ok: false
      kind: "network"
      error: string
      succeededCount: number
      failures: SequentialUploadFailure[]
      /** 應重試的檔案索引（含連線失敗的那一張與之後尚未上傳者） */
      retryIndices: number[]
    }
  | { ok: false; kind: "partial"; succeededCount: number; failures: SequentialUploadFailure[] }

/**
 * 依序上傳多張圖（每張一次 POST）。`indices` 若省略則上傳 `files` 的每一項。
 */
export async function uploadContentItemAttachmentsSequential(
  contentItemId: string,
  files: File[],
  options?: { indices?: number[] },
): Promise<UploadContentItemAttachmentsSequentialResult> {
  const id = contentItemId.trim()
  if (!id) {
    return {
      ok: false,
      kind: "partial",
      succeededCount: 0,
      failures: [{ index: -1, fileName: "", error: "缺少內容項目 id。" }],
    }
  }

  const indices =
    options?.indices?.length !== undefined && options.indices.length > 0
      ? options.indices
      : files.map((_, i) => i)

  let succeededCount = 0
  const failures: SequentialUploadFailure[] = []

  for (const i of indices) {
    const file = files[i]
    if (!file) continue

    const up = await uploadInstagramComposeMedia(id, file, { typeLabel: file.name })
    if (!up.ok) {
      if (up.kind === "network") {
        const posInBatch = indices.indexOf(i)
        const retryIndices = posInBatch === -1 ? [i] : indices.slice(posInBatch)
        return {
          ok: false,
          kind: "network",
          error: up.error,
          succeededCount,
          failures,
          retryIndices,
        }
      }
      failures.push({ index: i, fileName: file.name, error: up.error })
      continue
    }
    succeededCount++
  }

  if (failures.length === 0) {
    return { ok: true }
  }
  return { ok: false, kind: "partial", succeededCount, failures }
}
