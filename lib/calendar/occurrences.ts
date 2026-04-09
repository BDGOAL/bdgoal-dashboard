import type { ContentItem } from "@/lib/types/dashboard"

/** One dot on the calendar: either a scheduled slot or a publish time */
export type CalendarEventKind = "scheduled" | "published"

export type CalendarOccurrence = {
  /** Stable key for React lists */
  id: string
  item: ContentItem
  kind: CalendarEventKind
  /** ISO timestamp for this occurrence */
  at: string
}

/** YYYY-MM-DD in local timezone */
export function toLocalDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function dateToKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Expand items into 0–2 occurrences each (scheduled + published) */
export function buildOccurrences(items: ContentItem[]): CalendarOccurrence[] {
  const out: CalendarOccurrence[] = []
  for (const item of items) {
    if (item.scheduledAt) {
      out.push({
        id: `${item.id}-scheduled`,
        item,
        kind: "scheduled",
        at: item.scheduledAt,
      })
    }
    if (item.publishedAt) {
      out.push({
        id: `${item.id}-published`,
        item,
        kind: "published",
        at: item.publishedAt,
      })
    }
  }
  return out
}

export function filterOccurrencesByKind(
  occurrences: CalendarOccurrence[],
  kind: CalendarEventKind | "all",
): CalendarOccurrence[] {
  if (kind === "all") return occurrences
  return occurrences.filter((o) => o.kind === kind)
}

/** Sunday-first month grid: 6 rows × 7 cols */
export function getMonthGridCells(
  year: number,
  month: number,
): { date: Date; inMonth: boolean }[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push({
      date: d,
      inMonth: d.getMonth() === month,
    })
  }
  return cells
}

export function groupOccurrencesByDateKey(
  occurrences: CalendarOccurrence[],
): Map<string, CalendarOccurrence[]> {
  const m = new Map<string, CalendarOccurrence[]>()
  for (const o of occurrences) {
    const key = toLocalDateKey(o.at)
    const list = m.get(key) ?? []
    list.push(o)
    m.set(key, list)
  }
  for (const list of m.values()) {
    list.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    )
  }
  return m
}
