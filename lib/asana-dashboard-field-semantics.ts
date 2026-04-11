/**
 * ---------------------------------------------------------------------------
 * Asana ↔ Dashboard 欄位語意（僅文件／型別層級約定；本檔不執行邏輯）
 * ---------------------------------------------------------------------------
 *
 * **1. Asana 真實來源（custom fields + 任務本體）**
 * - Client, Platform, Content Type, Position, Workflow Stage, Planned Publish Date,
 *   Final Caption Status, Visual/Video Status, Dashboard Sync Status, Final Caption
 * - 以及任務標題、tags、attachments
 *
 * **2. Dashboard 內部處理**
 * - `clients.id`：由 Asana「Client」字串經 `ensureClientExists` 解析／建立
 * - `content_items` 的 uuid、`platform`／`content_type` 正規化屬儲存層／repository 行為
 *
 * **3. 非 Asana 來源（禁止描述成 Asana 同步）**
 * - `ContentItem.brandId`、`ContentItem.accountId`
 * - `WorkspaceScope` 的 brand／account 模式
 * - `pickScopeIds` 的合成 id 或 mock 對照
 *
 * **4. UI**
 * 若仍顯示 brand／account 範圍，僅能解讀為 **Dashboard 內部篩選維度或 fallback**，不可當 Asana truth。
 *
 * **5. 後續變更任務分類（回報時勿混用）**
 * - **A**：文件／註解／命名層修正
 * - **B**：實際 UI 或 data flow 行為修正
 *
 * 實作請見：`lib/integrations/asana-normalize.ts`、`lib/content/store.ts`、`lib/repositories/content-repository.ts`、
 * `lib/types/dashboard.ts`、`lib/types/agency.ts`、`lib/scope/*`。
 * ---------------------------------------------------------------------------
 */
export {}
