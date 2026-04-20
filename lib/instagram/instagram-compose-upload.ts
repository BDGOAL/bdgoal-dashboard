export type UploadContentAttachmentResult =
  | { ok: true; url: string; attachmentId: string }
  | { ok: false; error: string }

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
  const base = parts.length ? parts.join(" · ") : `上傳失敗（HTTP ${res.status}）。`
  return base
}

/**
 * Uploads an image for an existing content item (after POST /api/content/items).
 * Uses multipart POST to `/api/content/items/[id]/attachments`.
 */
export async function uploadInstagramComposeMedia(
  contentItemId: string,
  file: File,
  options?: { typeLabel?: string },
): Promise<UploadContentAttachmentResult> {
  const id = contentItemId.trim()
  if (!id) return { ok: false, error: "缺少內容項目 id。" }

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
      }
    }
  }

  if (!res.ok) {
    return { ok: false, error: formatApiError(res, json) }
  }

  const url = json.attachment?.url ?? json.url
  const attachmentId = json.attachment?.id
  if (!url || !attachmentId) {
    return { ok: false, error: "伺服器回應缺少附件資訊。" }
  }

  return { ok: true, url, attachmentId }
}
