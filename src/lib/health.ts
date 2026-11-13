/**
 * Health tracking (CLAUDE.md §4.7). Manual quick-log. Health data is never shared with schools
 * or anyone else.
 */
import { get, getAll, put, type HealthSource, type StoredHealth } from './db'

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

