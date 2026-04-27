-- 修復：刪除 content_items 時自動刪除關聯的 content_attachments
-- 避免非原子刪除造成孤兒 record（黑卡）

-- 1. 刪除現有的 foreign key（如果已存在，會 skip）
DO $$ BEGIN
  ALTER TABLE public.content_attachments
  DROP CONSTRAINT IF EXISTS content_attachments_content_item_id_fkey;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 2. 重建 foreign key 帶 ON DELETE CASCADE
DO $$ BEGIN
  ALTER TABLE public.content_attachments
  ADD CONSTRAINT content_attachments_content_item_id_fkey
  FOREIGN KEY (content_item_id)
  REFERENCES public.content_items(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. 同時確保 content_items 的 platform = 'instagram' 過濾正確
-- 檢查 instagramOrder 欄位有無索引
CREATE INDEX IF NOT EXISTS idx_content_items_instagram
ON public.content_items(platform, instagram_order)
WHERE platform = 'instagram';
