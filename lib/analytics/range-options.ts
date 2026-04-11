import type { AnalyticsDateRange } from "@/lib/types/analytics"

export const ANALYTICS_RANGE_OPTIONS: {
  value: AnalyticsDateRange
  label: string
}[] = [
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
]
