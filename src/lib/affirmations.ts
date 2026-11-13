import { SEED_AFFIRMATIONS, SITUATIONS, type Affirmation } from '../data/affirmations'
import { hashString, todayISO } from './dates'

/** Same affirmation all day, changes daily; stable across reloads and devices. */
export function dailyAffirmation(library: Affirmation[], date: string = todayISO()): Affirmation {
  const active = library.filter((a) => a.active)
  const list = active.length ? active : SEED_AFFIRMATIONS
  const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id))
  return sorted[hashString(`unity:${date}`) % sorted.length]
}

/** Affirmations matching a situation: tag matches first, then same-category fallbacks. */
export function forSituation(library: Affirmation[], situationId: string, limit = 8): Affirmation[] {
  const s = SITUATIONS.find((x) => x.id === situationId)
  if (!s) return []
  const active = library.filter((a) => a.active)
  const tagged = active.filter((a) => a.tags.some((t) => s.tags.includes(t)))
  const extra = active.filter((a) => !tagged.includes(a) && s.categories.includes(a.category))
  return [...tagged, ...extra].slice(0, limit)
}
