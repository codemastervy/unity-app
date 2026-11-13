/**
 * Gentle insights only: streaks and patterns, never diagnoses or
 * scores about mental illness.
 */
import { addDays, lastNDays, todayISO } from './dates'
import { getMood, MOODS } from './moods'

export interface EntryLite {
  id: string
  date: string
  mood: string
  stars: number
  updatedAt: number
}

/** The most recently updated entry for each date. */
export function latestByDate<T extends EntryLite>(entries: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const e of entries) {
    const cur = map.get(e.date)
    if (!cur || e.updatedAt > cur.updatedAt) map.set(e.date, e)
  }
  return map
}

/** Consecutive days with an entry, ending today (or yesterday if today isn't logged yet). */
export function currentStreak(entries: EntryLite[], today: string = todayISO()): number {
  const dates = new Set(entries.map((e) => e.date))
  let d = dates.has(today) ? today : addDays(today, -1)
  let n = 0
  while (dates.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

function isLowDay(dayEntries: EntryLite[]): boolean {
  return dayEntries.some((e) => getMood(e.mood)?.low || e.stars === 1)
}

export const LOW_STREAK_DAYS = 3

/**
 * True when the user has logged low moods (😢 / 😠 / 1 star) on LOW_STREAK_DAYS consecutive
 * days, ending today or yesterday. Used only to show a gentle support card — never to block
 * the user or contact anyone.
 */
export function hasLowMoodStreak(entries: EntryLite[], today: string = todayISO(), days = LOW_STREAK_DAYS): boolean {
  const byDate = new Map<string, EntryLite[]>()
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])
  const check = (end: string) => {
    for (let i = 0; i < days; i++) {
      const list = byDate.get(addDays(end, -i))
      if (!list || !isLowDay(list)) return false
    }
    return true
  }
  return check(today) || (!byDate.has(today) && check(addDays(today, -1)))
}

export interface DayPoint {
  date: string
  mood: number | null // 1–5 average mood score
  stars: number | null // average rating (rated entries only)
}

export function series(entries: EntryLite[], days: number, today: string = todayISO()): DayPoint[] {
  const byDate = new Map<string, EntryLite[]>()
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])
  return lastNDays(days, today).map((date) => {
    const list = byDate.get(date) ?? []
    const scores = list.map((e) => getMood(e.mood)?.score).filter((x): x is number => x != null)
    const stars = list.map((e) => e.stars).filter((s) => s > 0)
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
    return { date, mood: avg(scores), stars: avg(stars) }
  })
}

/** Short, warm lines for the mood tracker. */
export function insightLines(entries: EntryLite[], today: string = todayISO()): string[] {
  const lines: string[] = []
  if (!entries.length) return ['Your first entry is the hardest. Tap the journal button whenever you’re ready.']
  const streak = currentStreak(entries, today)
  if (streak >= 2) lines.push(`You’ve logged ${streak} days in a row. Nice one!`)
  else if (streak === 1) lines.push('You checked in recently — that’s a great habit to build.')

  const week = new Set(lastNDays(7, today))
  const thisWeek = entries.filter((e) => week.has(e.date))
  const daysThisWeek = new Set(thisWeek.map((e) => e.date)).size
  if (daysThisWeek) lines.push(`You checked in on ${daysThisWeek} of the last 7 days.`)

  const counts = new Map<string, number>()
  for (const e of thisWeek) counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] >= 2) {
    const m = MOODS.find((x) => x.id === top[0])
    if (m && !m.low) lines.push(`${m.emoji} ${m.label} showed up most this week.`)
    if (m?.low) lines.push('It’s been a heavier week. Be gentle with yourself — talking to someone can help.')
  }
  lines.push(`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} so far. Every one counts.`)
  return lines
}
