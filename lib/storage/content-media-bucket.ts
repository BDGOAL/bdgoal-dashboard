/**
 * Supabase Storage bucket for dashboard-uploaded media (content_attachments / thumbnails).
 *
 * **Bucket name:** see `CONTENT_MEDIA_BUCKET` (default `content-media`, override with
 * `NEXT_PUBLIC_SUPABASE_CONTENT_MEDIA_BUCKET`). All code must import from this file only.
 *
 * **Supabase Dashboard setup (not run from this repo):**
 * 1. Create the bucket with this exact id (or set the env var to match your bucket id).
 * 2. **Public URL behavior:** The API uses `getPublicUrl()` after upload. That returns a
 *    URL that only works for **anonymous HTTP read** if the bucket is **public** or you have
 *    a policy allowing `select` on `storage.objects` for `anon`. If the bucket is **private**,
 *    the URL will 403 in the browser — switch the bucket to public for thumbnails, or change
 *    the app to use **signed URLs** instead of `getPublicUrl`.
 * 3. **Policies on `storage.objects`:** Allow `authenticated` (or service role only if you
 *    upload exclusively via service role) to `insert` and `select` for keys under the
 *    `content-items/` prefix, e.g.:
 *    `(bucket_id = '<your-bucket>') AND (storage.foldername(name))[1] = 'content-items'`
 *
 * Upload failures often mean: missing bucket, missing insert policy, or wrong bucket id in env.
 */
export const CONTENT_MEDIA_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_CONTENT_MEDIA_BUCKET ?? "content-media"

/** Prefix for object keys: `{CONTENT_ITEMS_PREFIX}/{itemId}/...` */
export const CONTENT_MEDIA_ITEMS_PREFIX = "content-items"
