-- Allow public (anon) read for valid preview links and their client's content_items.
-- Without these, unauthenticated visitors see "Preview Unavailable" due to RLS.

drop policy if exists preview_links_select_by_token on public.preview_links;
create policy preview_links_select_by_token
  on public.preview_links for select to anon
  using (revoked_at is null and (expires_at is null or expires_at > now()));

drop policy if exists content_items_select_by_preview_token on public.content_items;
create policy content_items_select_by_preview_token
  on public.content_items for select to anon
  using (
    exists (
      select 1 from public.preview_links pl
      where pl.client_id = content_items.client_id
        and pl.revoked_at is null
        and (pl.expires_at is null or pl.expires_at > now())
    )
  );
