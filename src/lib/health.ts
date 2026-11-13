/**
 * Health tracking (CLAUDE.md §4.7). Manual quick-log everywhere; read-only sync from
 * Apple Health / Health Connect in the native apps. Health data is never shared with schools
 * or anyone else.
 */
import { get, getAll, put, type HealthSource, type StoredHealth } from './db'
import { lastNDays, toISODate } from './dates'
import { isNative, platform } from './platform'

export type HealthField = 'sleepHrs' | 'waterGlasses' | 'exerciseMins' | 'steps' | 'energy'

export const HEALTH_LIMITS: Record<HealthField, { min: number; max: number; step: number; label: string; unit: string }> = {
  sleepHrs: { min: 0, max: 24, step: 0.5, label: 'Sleep', unit: 'hrs' },
  waterGlasses: { min: 0, max: 40, step: 1, label: 'Water', unit: 'glasses' },
  exerciseMins: { min: 0, max: 1440, step: 5, label: 'Exercise', unit: 'mins' },
  steps: { min: 0, max: 200000, step: 100, label: 'Steps', unit: 'steps' },
  energy: { min: 1, max: 5, step: 1, label: 'Energy', unit: '/5' },
}

export function emptyHealth(date: string): StoredHealth {
  return { date, sleepHrs: null, waterGlasses: null, exerciseMins: null, steps: null, energy: null, source: 'manual', updatedAt: 0, dirty: false }
}

export function clampHealth(field: HealthField, value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null
  const l = HEALTH_LIMITS[field]
  const v = Math.min(l.max, Math.max(l.min, value))
  return field === 'sleepHrs' ? Math.round(v * 2) / 2 : Math.round(v)
}

export async function getHealth(date: string): Promise<StoredHealth> {
  return (await get<StoredHealth>('health', date)) ?? emptyHealth(date)
}

export async function listHealth(): Promise<StoredHealth[]> {
  return (await getAll<StoredHealth>('health')).sort((a, b) => b.date.localeCompare(a.date))
}

function mergeSource(a: HealthSource, b: HealthSource): HealthSource {
  return a === b ? a : 'mixed'
}

export async function saveHealth(date: string, patch: Partial<Record<HealthField, number | null>>, source: HealthSource = 'manual') {
  const cur = await getHealth(date)
  const next: StoredHealth = { ...cur, updatedAt: Date.now(), dirty: true, source: cur.updatedAt ? mergeSource(cur.source, source) : source }
  for (const [k, v] of Object.entries(patch) as [HealthField, number | null][]) next[k] = clampHealth(k, v)
  await put('health', next)
  return next
}

// ---------------------------------------------------------------------------------------
// Native read-only sync (steps, sleep, active minutes). Works fine if denied or unavailable.

export const nativeHealthName = () => (platform() === 'ios' ? 'Apple Health' : 'Health Connect')

async function plugin() {
  const { Health } = await import('@capgo/capacitor-health')
  return Health
}

const exerciseType = () => (platform() === 'ios' ? 'exerciseTime' : 'workouts')

export async function nativeHealthAvailable(): Promise<boolean> {
  if (!isNative()) return false
  try {
    return (await (await plugin()).isAvailable()).available
  } catch {
    return false
  }
}

/** Asks ONLY for read access to steps, sleep and active minutes. */
export async function requestNativeHealth(): Promise<boolean> {
  try {
    const H = await plugin()
    await H.requestAuthorization({ read: ['steps', 'sleep', exerciseType()], write: [] })
    return true
  } catch {
    return false
  }
}

/** Pulls the last `days` days from the device health store into local health logs. */
export async function syncNativeHealth(days = 14): Promise<number> {
  if (!isNative()) return 0
  const H = await plugin()
  const source: HealthSource = platform() === 'ios' ? 'healthkit' : 'healthconnect'
  const dates = lastNDays(days)
  const start = new Date(`${dates[0]}T00:00:00`)
  const end = new Date()
  const iso = (d: Date) => d.toISOString()
  const perDay: Record<string, Partial<Record<HealthField, number>>> = {}
  const add = (date: string, field: HealthField, v: number) => {
    perDay[date] = perDay[date] ?? {}
    perDay[date][field] = (perDay[date][field] ?? 0) + v
  }

  try {
    const { samples } = await H.queryAggregated({ dataType: 'steps', startDate: iso(start), endDate: iso(end), bucket: 'day', aggregation: 'sum' })
    for (const s of samples) add(toISODate(new Date(s.startDate)), 'steps', s.value)
  } catch {
    /* permission denied or unsupported */
  }
  try {
    const { samples } = await H.readSamples({ dataType: 'sleep', startDate: iso(new Date(start.getTime() - 12 * 3600e3)), endDate: iso(end), limit: 2000 })
    for (const s of samples) {
      if (s.sleepState === 'awake' || s.sleepState === 'inBed') continue
      const mins = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000
      add(toISODate(new Date(s.endDate)), 'sleepHrs', mins / 60) // sleep counts toward the morning you woke up
    }
  } catch {
    /* ignore */
  }
  try {
    if (platform() === 'ios') {
      const { samples } = await H.readSamples({ dataType: 'exerciseTime', startDate: iso(start), endDate: iso(end), limit: 5000 })
      for (const s of samples) add(toISODate(new Date(s.startDate)), 'exerciseMins', s.value)
    } else {
      const { workouts } = await H.queryWorkouts({ startDate: iso(start), endDate: iso(end), limit: 500 })
      for (const w of workouts) add(toISODate(new Date(w.startDate)), 'exerciseMins', w.duration / 60)
    }
  } catch {
    /* ignore */
  }

  let n = 0
  for (const [date, patch] of Object.entries(perDay)) {
    await saveHealth(date, patch, source)
    n++
  }
  return n
}
