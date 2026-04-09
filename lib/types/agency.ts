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

/** Global workspace filter for agency multi-tenant UI */
export type WorkspaceScope =
  | { mode: "all" }
  | { mode: "client"; clientId: string }
  | { mode: "brand"; brandId: string }
  | { mode: "account"; accountId: string }
