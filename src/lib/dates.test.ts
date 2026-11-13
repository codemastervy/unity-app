import { describe, expect, it } from 'vitest'
import { addDays, dateRange, isValidISODate, lastNDays, monthGrid } from './dates'

describe('dates', () => {
  it('adds days across month/year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-29')).toBe(false)
    expect(isValidISODate('2028-02-29')).toBe(true)
    expect(isValidISODate('2026-1-01')).toBe(false)
  })
  it('builds ranges', () => {
    expect(dateRange('2026-11-01', '2026-11-03')).toEqual(['2026-11-01', '2026-11-02', '2026-11-03'])
    expect(lastNDays(7, '2026-11-13')).toHaveLength(7)
  })
  it('builds a Sunday-first month grid', () => {
    const g = monthGrid(2026, 10) // November 2026 starts on a Sunday
    expect(g[0][0]).toBe('2026-11-01')
    expect(g.flat().filter(Boolean)).toHaveLength(30)
    g.forEach((w) => expect(w).toHaveLength(7))
  })
})
