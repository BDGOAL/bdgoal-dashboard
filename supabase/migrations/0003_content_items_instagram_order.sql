-- Instagram 牆面排序（每列一個整數，同 client + platform 內遞增；null 表示尚未參與排序）
alter table public.content_items
  add column if not exists instagram_order integer;

create index if not exists idx_content_items_client_platform_ig_order
  on public.content_items (client_id, platform, instagram_order);
