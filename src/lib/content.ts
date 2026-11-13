/**
 * Affirmations + resources: bundled seed data, refreshed from Firestore (public read,
 * admin-only write) when Firebase is configured, so they can change without an app release.
 */
import { CATEGORIES, SEED_AFFIRMATIONS, type Affirmation, type CategoryId } from '../data/affirmations'
import { SECTIONS, SEED_RESOURCES, type Resource, type SectionId } from '../data/resources'
import { getAll, kvGet, kvSet, put, type StoredFavourite } from './db'
import { backend, isDemoBackend } from './backend'
import { getFirebase } from './firebase'
import { isValidISODate } from './dates'

const str = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : undefined)
const isHttps = (u: unknown) => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u)
const digits = (v: unknown) => (typeof v === 'string' && /^\+?\d{3,15}$/.test(v) ? v : undefined)

function cleanAffirmation(id: string, d: Record<string, unknown>): Affirmation | null {
  const text = str(d.text, 300)
  const category = d.category as CategoryId
  if (!text || !CATEGORIES.some((c) => c.id === category)) return null
  const tags = Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === 'string').slice(0, 20) : []
  return { id, text, category, tags, active: d.active !== false }
}

function cleanResource(id: string, d: Record<string, unknown>): Resource | null {
  const name = str(d.name, 100)
  const section = d.section as SectionId
  if (!name || !SECTIONS.some((s) => s.id === section)) return null
  return {
    id,
    name,
    section,
    description: str(d.description, 300) ?? '',
    phone: digits(d.phone),
    phoneLabel: str(d.phoneLabel, 30),
    sms: digits(d.sms),
    url: isHttps(d.url) ? (d.url as string) : undefined,
    hours: str(d.hours, 100),
    logo: isHttps(d.logo) ? (d.logo as string) : undefined,
    lastVerified: typeof d.lastVerified === 'string' && isValidISODate(d.lastVerified) ? d.lastVerified : '',
  }
}

export async function cachedAffirmations(): Promise<Affirmation[]> {
  return (await kvGet<Affirmation[]>('content.affirmations')) ?? SEED_AFFIRMATIONS
}

export async function cachedResources(): Promise<Resource[]> {
  return (await kvGet<Resource[]>('content.resources')) ?? SEED_RESOURCES
}

/** Fetches the live library + directory. Silently keeps the cached/seed copy if offline. */
export async function refreshContent(): Promise<{ affirmations: Affirmation[]; resources: Resource[] } | null> {
  if (isDemoBackend || !navigator.onLine) return null // demo: bundled seed content
  try {
    const { db } = await getFirebase()
    const { collection, getDocs } = await import('firebase/firestore')
    const [aSnap, rSnap] = await Promise.all([getDocs(collection(db, 'affirmations')), getDocs(collection(db, 'resources'))])
    const affirmations = aSnap.docs.map((d) => cleanAffirmation(d.id, d.data())).filter((x): x is Affirmation => !!x)
    const resources = rSnap.docs.map((d) => cleanResource(d.id, d.data())).filter((x): x is Resource => !!x)
    // Only replace the bundled data when the server actually has content.
    if (affirmations.length) await kvSet('content.affirmations', affirmations)
    if (resources.length) await kvSet('content.resources', resources)
    return { affirmations: affirmations.length ? affirmations : await cachedAffirmations(), resources: resources.length ? resources : await cachedResources() }
  } catch {
    return null
  }
}

// ---- Favourites ------------------------------------------------------------------------

export async function listFavouriteIds(): Promise<Set<string>> {
  return new Set((await getAll<StoredFavourite>('favourites')).filter((f) => !f.deleted).map((f) => f.id))
}

export async function setFavourite(id: string, on: boolean) {
  await put<StoredFavourite>('favourites', { id, addedAt: Date.now(), deleted: !on, dirty: true })
}

// ---- Suggestions (moderation queue) ---------------------------------------------------------

export const SUGGESTION_MAX = 200

export interface MySuggestion {
  id: string
  text: string
  status: 'pending' | 'approved' | 'rejected'
}

export async function submitSuggestion(uid: string, text: string, category: CategoryId) {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length < 5) throw new Error('Write a little more — at least 5 characters.')
  if (clean.length > SUGGESTION_MAX) throw new Error(`Keep it under ${SUGGESTION_MAX} characters.`)
  try {
    await backend.submitSuggestion(uid, clean, category)
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') throw new Error('You just sent one — please wait a minute before sending another.', { cause: e })
    throw new Error('Couldn’t send that right now. Check your connection and try again.', { cause: e })
  }
}

export async function listMySuggestions(uid: string): Promise<MySuggestion[]> {
  return (await backend.listSuggestions(uid)).map((d) => ({ id: d.id, text: String(d.data.text ?? ''), status: d.data.status as MySuggestion['status'] }))
}
