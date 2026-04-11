-- Allow editors/admins to create clients when importing from Asana (UI path).
create policy "clients_insert_by_editor_or_admin"
on public.clients for insert
to authenticated
with check (public.current_app_role() in ('admin', 'editor'));

-- First membership row for a client: creator can add self as admin (no existing rows for that client).
create policy "client_memberships_insert_first_admin_self"
on public.client_memberships for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'admin'
  and public.current_app_role() in ('admin', 'editor')
  and not exists (
    select 1 from public.client_memberships cm0
    where cm0.client_id = client_id
  )
);
