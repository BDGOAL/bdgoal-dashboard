-- BDGoal dashboard internal launch schema
create extension if not exists "pgcrypto";

create table if not exists public.clients (
  id text primary key,
  name text not null,
  slug text unique not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  role text not null check (role in ('admin','editor','viewer','client_viewer')),
  unique (user_id, client_id)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.clients(id) on delete cascade,
  platform text not null,
  content_type text not null,
  title text not null,
  caption text not null default '',
  planned_publish_date timestamptz,
  scheduled_at timestamptz,
  status text not null check (status in ('planning','scheduled','published')),
  source text not null check (source in ('asana','manual','mock')),
  source_task_gid text,
  position text,
  thumbnail text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_content_items_asana_unique
  on public.content_items (source, source_task_gid)
  where source = 'asana' and source_task_gid is not null;

create table if not exists public.content_attachments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  url text not null,
  type text,
  sort_order int not null default 0
);

create table if not exists public.preview_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  client_id text not null references public.clients(id) on delete cascade,
  month_key text not null,
  view_type text not null check (view_type in ('grid','calendar')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_content_items_updated_at on public.content_items;
create trigger trg_content_items_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.client_memberships enable row level security;
alter table public.content_items enable row level security;
alter table public.content_attachments enable row level security;
alter table public.preview_links enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.can_access_client(target_client_id text)
returns boolean
language sql
stable
as $$
  select
    public.current_app_role() = 'admin'
    or exists (
      select 1 from public.client_memberships cm
      where cm.user_id = auth.uid()
        and cm.client_id = target_client_id
    )
$$;

create or replace function public.can_edit_client(target_client_id text)
returns boolean
language sql
stable
as $$
  select
    public.current_app_role() = 'admin'
    or exists (
      select 1 from public.client_memberships cm
      where cm.user_id = auth.uid()
        and cm.client_id = target_client_id
        and cm.role in ('admin','editor')
    )
$$;

-- profiles
create policy "profiles_select_self"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin');

create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_self_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin')
with check (id = auth.uid() or public.current_app_role() = 'admin');

-- memberships
create policy "memberships_select_own_or_admin"
on public.client_memberships for select
to authenticated
using (user_id = auth.uid() or public.current_app_role() = 'admin');

create policy "memberships_admin_manage"
on public.client_memberships for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- clients
create policy "clients_select_by_membership"
on public.clients for select
to authenticated
using (public.can_access_client(id));

-- content_items
create policy "content_select_by_client_access"
on public.content_items for select
to authenticated
using (public.can_access_client(client_id));

create policy "content_insert_by_client_edit"
on public.content_items for insert
to authenticated
with check (public.can_edit_client(client_id));

create policy "content_update_by_client_edit"
on public.content_items for update
to authenticated
using (public.can_edit_client(client_id))
with check (public.can_edit_client(client_id));

create policy "content_delete_by_client_edit"
on public.content_items for delete
to authenticated
using (public.can_edit_client(client_id));

-- attachments
create policy "attachments_select_by_content_client"
on public.content_attachments for select
to authenticated
using (
  exists (
    select 1
    from public.content_items ci
    where ci.id = content_item_id
      and public.can_access_client(ci.client_id)
  )
);

create policy "attachments_edit_by_content_client"
on public.content_attachments for all
to authenticated
using (
  exists (
    select 1
    from public.content_items ci
    where ci.id = content_item_id
      and public.can_edit_client(ci.client_id)
  )
)
with check (
  exists (
    select 1
    from public.content_items ci
    where ci.id = content_item_id
      and public.can_edit_client(ci.client_id)
  )
);

-- preview_links (internal)
create policy "preview_links_select_by_client"
on public.preview_links for select
to authenticated
using (public.can_access_client(client_id));

create policy "preview_links_manage_by_client_editor"
on public.preview_links for all
to authenticated
using (public.can_edit_client(client_id))
with check (public.can_edit_client(client_id));

