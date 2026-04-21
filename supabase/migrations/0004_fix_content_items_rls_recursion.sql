-- Fix recursive RLS evaluation path causing:
-- "stack depth limit exceeded" on content_items queries.
--
-- Root cause:
-- content_items policy -> can_access_client() -> current_app_role() -> SELECT profiles
-- profiles SELECT policy itself also called current_app_role(), creating recursive policy/function evaluation.
--
-- Strategy:
-- 1) Make helper functions SECURITY DEFINER so internal membership/profile lookups do not recursively
--    re-enter row policies.
-- 2) Inline role/membership checks in can_access_client/can_edit_client (direct EXISTS-based checks).

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'viewer'
  )
$$;

create or replace function public.can_access_client(target_client_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(
      (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
      false
    )
    or exists (
      select 1
      from public.client_memberships cm
      where cm.user_id = auth.uid()
        and cm.client_id = target_client_id
    )
$$;

create or replace function public.can_edit_client(target_client_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(
      (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
      false
    )
    or exists (
      select 1
      from public.client_memberships cm
      where cm.user_id = auth.uid()
        and cm.client_id = target_client_id
        and cm.role in ('admin', 'editor')
    )
$$;

