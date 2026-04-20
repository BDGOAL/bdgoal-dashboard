export type UploadContentAttachmentResult =
  | { ok: true; url: string; attachmentId: string }
  | { ok: false; error: string }

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

  try {
    const res = await fetch(`/api/content/items/${encodeURIComponent(id)}/attachments`, {
      method: "POST",
      body: fd,
    })
    const json = (await res.json()) as {
      ok?: boolean
      error?: string
      attachment?: { id: string; url: string }
      url?: string
    }

    if (!res.ok) {
      return { ok: false, error: json.error ?? `上傳失敗（${res.status}）。` }
    }

    const url = json.attachment?.url ?? json.url
    const attachmentId = json.attachment?.id
    if (!url || !attachmentId) {
      return { ok: false, error: "伺服器回應缺少附件資訊。" }
    }

    return { ok: true, url, attachmentId }
  } catch {
    return { ok: false, error: "網路錯誤，上傳未完成。" }
  }
}
