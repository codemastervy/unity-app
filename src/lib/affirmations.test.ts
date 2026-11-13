import { describe, expect, it } from 'vitest'
import { SEED_AFFIRMATIONS, SITUATIONS } from '../data/affirmations'
import { dailyAffirmation, forSituation } from './affirmations'

describe('affirmations', () => {
  it('gives the same affirmation all day and changes across days', () => {
    expect(dailyAffirmation(SEED_AFFIRMATIONS, '2026-11-13').id).toBe(dailyAffirmation(SEED_AFFIRMATIONS, '2026-11-13').id)
    const week = new Set(['10', '11', '12', '13', '14', '15', '16'].map((d) => dailyAffirmation(SEED_AFFIRMATIONS, `2026-11-${d}`).id))
    expect(week.size).toBeGreaterThan(3)
  })

  it('has matches for every situation', () => {
    for (const s of SITUATIONS) expect(forSituation(SEED_AFFIRMATIONS, s.id).length).toBeGreaterThanOrEqual(3)
  })

  it('contains no wealth / abundance / work phrases', () => {
    const all = SEED_AFFIRMATIONS.map((a) => a.text.toLowerCase()).join(' ')
    for (const w of ['wealth', 'abundance', 'prosperity', 'money', 'my work', 'diet', 'weight']) expect(all).not.toContain(w)
  })

  it('has unique ids', () => {
    expect(new Set(SEED_AFFIRMATIONS.map((a) => a.id)).size).toBe(SEED_AFFIRMATIONS.length)
  })
})
