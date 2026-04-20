/**
 * 客戶端壓縮：降低上傳本文大小，避免邊緣主機（如 Vercel）對 Route Handler 的 **FUNCTION_PAYLOAD_TOO_LARGE / 413**。
 * 適用於編排預覽圖，非最終 IG 發佈畫質保證。
 */

/** 長邊上限（px） */
export const PLANNER_UPLOAD_MAX_EDGE = 1920

/** JPEG 品質（0–1） */
export const PLANNER_UPLOAD_JPEG_QUALITY = 0.82

/** 單檔壓縮後仍超過則於 UI 提示（bytes） */
export const PLANNER_UPLOAD_MAX_OUTPUT_BYTES = 3 * 1024 * 1024

/** 單次選取張數上限 */
export const PLANNER_UPLOAD_MAX_FILES = 12

/** 拒絕處理的原始檔大小（bytes）— 避免記憶體爆掉 */
export const PLANNER_UPLOAD_MAX_ORIGINAL_BYTES = 45 * 1024 * 1024

const COMPRESSIBLE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
])

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.decoding = "async"
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("無法載入圖片（格式可能不支援）。請改用 JPEG／PNG／WebP。"))
    }
    img.src = url
  })
}

function stripExtension(name: string): string {
  const i = name.lastIndexOf(".")
  if (i <= 0) return name.trim() || "image"
  return name.slice(0, i).trim() || "image"
}

/**
 * 將圖片縮放並輸出為 JPEG，以縮小 multipart 本文。
 * SVG 不經 canvas 重繪（避免複雜度），原檔回傳；若仍過大由呼叫端提示。
 */
export async function compressImageForPlannerUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("請選擇圖片檔。")
  }
  if (file.size > PLANNER_UPLOAD_MAX_ORIGINAL_BYTES) {
    throw new Error(
      `檔案過大（>${Math.round(PLANNER_UPLOAD_MAX_ORIGINAL_BYTES / 1024 / 1024)}MB），請先縮小後再試。`,
    )
  }
  if (file.type === "image/svg+xml") {
    return file
  }
  if (!COMPRESSIBLE.has(file.type)) {
    throw new Error("不支援的圖片格式，請使用 JPEG、PNG、WebP 或 GIF。")
  }

  const img = await loadImageFromFile(file)
  const { naturalWidth: w0, naturalHeight: h0 } = img
  if (!w0 || !h0) {
    throw new Error("無法讀取圖片尺寸。")
  }

  const scale = Math.min(1, PLANNER_UPLOAD_MAX_EDGE / Math.max(w0, h0))
  const w = Math.max(1, Math.round(w0 * scale))
  const h = Math.max(1, Math.round(h0 * scale))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("無法建立畫布，請換瀏覽器再試。")
  }
  ctx.drawImage(img, 0, 0, w, h)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", PLANNER_UPLOAD_JPEG_QUALITY)
  })
  if (!blob) {
    throw new Error("圖片壓縮失敗，請換一張圖再試。")
  }

  const base = stripExtension(file.name)
  const outName = `${base}.jpg`
  return new File([blob], outName, { type: "image/jpeg", lastModified: Date.now() })
}

export function validatePlannerImageFileForQueue(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "僅支援圖片（image/*）。"
  }
  if (file.type === "image/svg+xml") {
    return null
  }
  if (!COMPRESSIBLE.has(file.type)) {
    return "格式請使用 JPEG、PNG、WebP 或 GIF。"
  }
  if (file.size > PLANNER_UPLOAD_MAX_ORIGINAL_BYTES) {
    return `單檔請小於 ${Math.round(PLANNER_UPLOAD_MAX_ORIGINAL_BYTES / 1024 / 1024)}MB。`
  }
  return null
}
