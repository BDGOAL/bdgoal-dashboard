/** Quick filters for industry news list — client-side only. */

export type NewsTimeWindow = "all" | "today" | "7d" | "week"

export const NEWS_TIME_WINDOW_LABEL: Record<NewsTimeWindow, string> = {
  all: "全部期間",
  today: "今日",
  "7d": "近 7 天",
  week: "本週",
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Monday-start week (common for TW business calendars). */
function startOfWeekMonday(ref: Date) {
  const day = ref.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const ws = new Date(ref)
  ws.setDate(ref.getDate() + offset)
  return startOfLocalDay(ws)
}

export function newsItemMatchesTimeWindow(
  publishDateIso: string,
  window: NewsTimeWindow,
  now: Date = new Date(),
): boolean {
  if (window === "all") return true
  const pub = startOfLocalDay(new Date(publishDateIso))
  const today = startOfLocalDay(now)
  const diffMs = today.getTime() - pub.getTime()
  const diffDays = diffMs / 86_400_000

  if (window === "today") {
    return pub.getTime() === today.getTime()
  }
  if (window === "7d") {
    return diffDays >= 0 && diffDays < 7
  }
  if (window === "week") {
    const ws = startOfWeekMonday(today)
    const we = new Date(ws)
    we.setDate(ws.getDate() + 6)
    return pub >= ws && pub <= we
  }
  return true
}
