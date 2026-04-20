/**
 * Supabase Storage bucket for dashboard-uploaded media (content_attachments / thumbnails).
 *
 * **Setup (Supabase Dashboard — not run from this repo):**
 * 1. Create a bucket named `content-media` (or set `NEXT_PUBLIC_SUPABASE_CONTENT_MEDIA_BUCKET`).
 * 2. Prefer **public** read if you use `getPublicUrl` below; otherwise switch to signed URLs.
 * 3. Add policies so `authenticated` users can `insert` / `select` on paths under `content-items/`:
 *    e.g. `(bucket_id = 'content-media') AND (storage.foldername(name))[1] = 'content-items'`
 *
 * Without these policies, uploads will fail with Storage permission errors.
 */
export const CONTENT_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_CONTENT_MEDIA_BUCKET ?? "content-media"

/** Prefix for object keys: `{CONTENT_ITEMS_PREFIX}/{itemId}/...` */
export const CONTENT_MEDIA_ITEMS_PREFIX = "content-items"
