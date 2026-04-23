/**
 * Remove common image-delivery / resize query params so links point at the original object.
 * Safe for Supabase Storage public URLs and similar CDNs that append ?width=&quality= etc.
 */
const PARAMS_TO_STRIP = new Set([
  "width",
  "height",
  "quality",
  "resize",
  "format",
])

export function stripImageDeliveryParams(url: string | null | undefined): string {
  const s = (url ?? "").trim()
  if (!s) return ""
  try {
    const u = new URL(s)
    for (const key of [...u.searchParams.keys()]) {
      if (PARAMS_TO_STRIP.has(key.toLowerCase())) {
        u.searchParams.delete(key)
      }
    }
    const out = u.toString()
    return out.endsWith("?") ? out.slice(0, -1) : out
  } catch {
    return s
  }
}
