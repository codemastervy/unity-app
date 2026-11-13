import { beforeEach, describe, expect, it } from 'vitest'
import { wipeAll } from './db'
import { clampHealth, getHealth, saveHealth } from './health'

beforeEach(() => wipeAll())

describe('health', () => {
  it('clamps values to sensible ranges', () => {
    expect(clampHealth('sleepHrs', 30)).toBe(24)
    expect(clampHealth('sleepHrs', 7.3)).toBe(7.5)
    expect(clampHealth('energy', 0)).toBe(1)
    expect(clampHealth('steps', -5)).toBe(0)
    expect(clampHealth('water' as never, NaN)).toBeNull()
  })
  it('merges manual logs', async () => {
    await saveHealth('2026-11-13', { waterGlasses: 6 })
    await saveHealth('2026-11-13', { sleepHrs: 8 })
    const h = await getHealth('2026-11-13')
    expect(h).toMatchObject({ waterGlasses: 6, sleepHrs: 8, source: 'manual', dirty: true })
  })
  it('marks mixed sources', async () => {
    await saveHealth('2026-11-13', { waterGlasses: 6 })
    await saveHealth('2026-11-13', { steps: 9000 }, 'healthkit')
    expect((await getHealth('2026-11-13')).source).toBe('mixed')
  })
})
