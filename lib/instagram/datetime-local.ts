/**
 * `datetime-local` 輸入需使用使用者本地時區的日曆元件，不可直接用 `toISOString().slice(0,16)`（會變成 UTC 時鐘顯示）。
 */
export function isoToDatetimeLocalInput(iso: string | null | undefined): string {
  if (!iso?.trim()) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day}T${h}:${min}`
}

export function contentItemPlannedInputValue(item: {
  plannedPublishDate?: string | null
  scheduledAt?: string | null
}): string {
  return isoToDatetimeLocalInput(item.plannedPublishDate ?? item.scheduledAt ?? null)
}
