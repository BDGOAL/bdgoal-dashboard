import type { Brand, Client, SocialAccount } from "@/lib/types/agency"

export const mockClients: Client[] = [
  { id: "cl-aurora", name: "Aurora 食品" },
  { id: "cl-pulse", name: "Pulse 科技" },
]

export const mockBrands: Brand[] = [
  { id: "br-aurora-main", name: "Aurora 主品牌", clientId: "cl-aurora" },
  { id: "br-aurora-tea", name: "茶飲副牌", clientId: "cl-aurora" },
  { id: "br-pulse-core", name: "Pulse 核心", clientId: "cl-pulse" },
]

export const mockSocialAccounts: SocialAccount[] = [
  {
    id: "acc-aurora-ig",
    name: "Aurora 主 IG",
    platform: "instagram",
    handle: "@aurorafoods_tw",
    clientId: "cl-aurora",
    brandId: "br-aurora-main",
  },
  {
    id: "acc-aurora-yt",
    name: "Aurora 影片",
    platform: "youtube",
    handle: "AuroraFoods",
    clientId: "cl-aurora",
    brandId: "br-aurora-main",
  },
  {
    id: "acc-tea-ig",
    name: "茶飲 IG",
    platform: "instagram",
    handle: "@aurora_tea",
    clientId: "cl-aurora",
    brandId: "br-aurora-tea",
  },
  {
    id: "acc-tea-th",
    name: "茶飲 Threads",
    platform: "threads",
    handle: "@aurora_tea",
    clientId: "cl-aurora",
    brandId: "br-aurora-tea",
  },
  {
    id: "acc-pulse-ig",
    name: "Pulse 主 IG",
    platform: "instagram",
    handle: "@pulsetech",
    clientId: "cl-pulse",
    brandId: "br-pulse-core",
  },
  {
    id: "acc-pulse-yt",
    name: "Pulse Shorts",
    platform: "youtube",
    handle: "PulseTech",
    clientId: "cl-pulse",
    brandId: "br-pulse-core",
  },
  {
    id: "acc-pulse-x",
    name: "Pulse 公告",
    platform: "x",
    handle: "@pulse_tw",
    clientId: "cl-pulse",
    brandId: "br-pulse-core",
  },
  {
    id: "acc-pulse-tt",
    name: "Pulse TikTok",
    platform: "tiktok",
    handle: "@pulsetech",
    clientId: "cl-pulse",
    brandId: "br-pulse-core",
  },
]
