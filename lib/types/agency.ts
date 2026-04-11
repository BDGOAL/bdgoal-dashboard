import type { ContentPlatform } from "@/lib/types/dashboard"

export type Client = {
  id: string
  name: string
}

export type Brand = {
  id: string
  name: string
  clientId: string
}

export type SocialAccount = {
  id: string
  name: string
  platform: ContentPlatform
  handle: string
  clientId: string
  brandId: string
}

/**
 * 頂端「範圍」篩選。`client` 可對應 DB 真實客戶。
 * `brand`／`account` 為 Dashboard／示範用維度，**不是** Asana custom field，也不得宣稱來自 Asana 同步。
 */
export type WorkspaceScope =
  | { mode: "all" }
  | { mode: "client"; clientId: string }
  | { mode: "brand"; brandId: string }
  | { mode: "account"; accountId: string }
