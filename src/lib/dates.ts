/** Local-calendar date helpers. Dates are stored as 'YYYY-MM-DD' in the user's local time. */

export const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return toISODate(parseISODate(s)) === s
}

/** Days from `from` to `to` inclusive, oldest first. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export function lastNDays(n: number, end: string = todayISO()): string[] {
  return dateRange(addDays(end, -(n - 1)), end)
}

const LOCALE = 'en-NZ'

export function formatLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

/** Weeks of a month for a Sunday-first calendar grid. `null` = padding cell. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(first.getDay()).fill(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(toISODate(new Date(year, month, day)))
  while (cells.length % 7) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Stable small hash of a string (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
