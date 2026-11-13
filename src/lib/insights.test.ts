import { describe, expect, it } from 'vitest'
import { currentStreak, hasLowMoodStreak, insightLines, series, type EntryLite } from './insights'

const e = (date: string, mood: string, stars = 3): EntryLite => ({ id: date + mood, date, mood, stars, updatedAt: 1 })
const T = '2026-11-13'

describe('insights', () => {
  it('counts streaks ending today or yesterday', () => {
    expect(currentStreak([e('2026-11-13', 'good'), e('2026-11-12', 'good'), e('2026-11-10', 'good')], T)).toBe(2)
    expect(currentStreak([e('2026-11-12', 'good'), e('2026-11-11', 'good')], T)).toBe(2)
    expect(currentStreak([e('2026-11-10', 'good')], T)).toBe(0)
  })

  it('detects 3 low days in a row (sad / angry / 1 star)', () => {
    expect(hasLowMoodStreak([e('2026-11-13', 'sad'), e('2026-11-12', 'angry'), e('2026-11-11', 'good', 1)], T)).toBe(true)
    expect(hasLowMoodStreak([e('2026-11-12', 'sad'), e('2026-11-11', 'sad'), e('2026-11-10', 'sad')], T)).toBe(true)
  })

  it('does not trigger on a gap or a good day', () => {
    expect(hasLowMoodStreak([e('2026-11-13', 'sad'), e('2026-11-11', 'sad'), e('2026-11-10', 'sad')], T)).toBe(false)
    expect(hasLowMoodStreak([e('2026-11-13', 'great', 5), e('2026-11-12', 'sad'), e('2026-11-11', 'sad'), e('2026-11-10', 'sad')], T)).toBe(false)
    expect(hasLowMoodStreak([e('2026-11-13', 'sad'), e('2026-11-12', 'sad')], T)).toBe(false)
  })

  it('builds a daily series with gaps as null', () => {
    const s = series([e('2026-11-13', 'great', 5), e('2026-11-13', 'okay', 0)], 7, T)
    expect(s).toHaveLength(7)
    expect(s[6]).toEqual({ date: T, mood: 4, stars: 5 })
    expect(s[0].mood).toBeNull()
  })

  it('never produces diagnostic language', () => {
    const lines = insightLines([e('2026-11-13', 'sad'), e('2026-11-12', 'sad')], T).join(' ').toLowerCase()
    for (const word of ['depress', 'disorder', 'diagnos', 'ill', 'risk', 'score']) expect(lines).not.toContain(word)
  })
})
