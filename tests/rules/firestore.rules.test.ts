import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { deleteDoc, doc, getDoc, getDocs, collection, query, where, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'

let env: RulesTestEnvironment
const NOW = 1763000000000

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-unity',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const alice = () => env.authenticatedContext('alice', { email: 'a@x.nz', email_verified: true }).firestore()
const bob = () => env.authenticatedContext('bob', { email: 'b@x.nz', email_verified: true }).firestore()
const unverified = () => env.authenticatedContext('alice', { email: 'a@x.nz', email_verified: false }).firestore()
const anon = () => env.unauthenticatedContext().firestore()

const userDoc = () => ({
  nickname: 'Al',
  createdAt: NOW,
  settings: { theme: 'system', textScale: 1, reminderHour: 20, reminderMinute: 0 },
  encKeyCheck: 'v1:QUJDREVGR0hJSktMTU5PUA==',
  keyWrap: { salt: 'c2FsdHNhbHRzYWx0c2FsdA==', wrapped: 'd3JhcHBlZHdyYXBwZWR3cmFwcGVkd3JhcHBlZA==', iter: 600000 },
})
const entry = (over: Record<string, unknown> = {}) => ({
  date: '2026-11-13',
  mood: 'good',
  stars: 4,
  oneWordEnc: 'v1:U29tZUNpcGhlcnRleHQ=',
  journalEnc: '',
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
})

describe('users/{uid}', () => {
  it('owner can create and read a valid profile', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), userDoc()))
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')))
  })
  it('other users and anonymous cannot read or write it', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'users/alice'), userDoc()))
    await assertFails(getDoc(doc(bob(), 'users/alice')))
    await assertFails(getDoc(doc(anon(), 'users/alice')))
    await assertFails(setDoc(doc(bob(), 'users/alice'), userDoc()))
  })
  it('requires a verified email', async () => {
    await assertFails(setDoc(doc(unverified(), 'users/alice'), userDoc()))
  })
  it('rejects extra fields like a real name', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice'), { ...userDoc(), realName: 'Alice Smith' }))
  })
  it('rejects weak key wrapping and long nicknames', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice'), { ...userDoc(), keyWrap: { ...userDoc().keyWrap, iter: 1000 } }))
    await assertFails(setDoc(doc(alice(), 'users/alice'), { ...userDoc(), nickname: 'x'.repeat(31) }))
  })
  it('cannot change createdAt', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), userDoc()))
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { createdAt: NOW + 1 }))
    await assertSucceeds(updateDoc(doc(alice(), 'users/alice'), { nickname: 'Ally' }))
  })
})

describe('entries', () => {
  it('owner can write a valid encrypted entry and delete it', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/entries/e1'), entry()))
    await assertSucceeds(deleteDoc(doc(alice(), 'users/alice/entries/e1')))
  })
  it('blocks plaintext journal / one-word fields', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ oneWordEnc: 'Happy' })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ journalEnc: 'Dear diary, today...' })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ oneWordEnc: '' })))
  })
  it('validates mood, stars, date, timestamps and unknown fields', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ mood: 'skull' })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ stars: 6 })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ stars: 2.5 })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ date: '13/11/2026' })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ updatedAt: NOW - 1 })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ location: 'Rotorua' })))
    await assertFails(setDoc(doc(alice(), 'users/alice/entries/e1'), entry({ journalEnc: 'v1:' + 'A'.repeat(60001) })))
  })
  it("can't touch someone else's entries", async () => {
    await assertFails(setDoc(doc(bob(), 'users/alice/entries/e1'), entry()))
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'users/alice/entries/e1'), entry()))
    await assertFails(getDoc(doc(bob(), 'users/alice/entries/e1')))
    await assertFails(getDocs(collection(bob(), 'users/alice/entries')))
    await assertFails(deleteDoc(doc(bob(), 'users/alice/entries/e1')))
  })
})

describe('health + favourites', () => {
  it('accepts valid health logs incl. nulls', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/health/2026-11-13'), { sleepHrs: 7.5, waterGlasses: 6, exerciseMins: null, steps: 9000, energy: null, source: 'manual', updatedAt: NOW }))
  })
  it('rejects out-of-range or badly keyed health logs', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/health/2026-11-13'), { sleepHrs: 30, source: 'manual', updatedAt: NOW }))
    await assertFails(setDoc(doc(alice(), 'users/alice/health/2026-11-13'), { weightKg: 60, source: 'manual', updatedAt: NOW }))
    await assertFails(setDoc(doc(alice(), 'users/alice/health/today'), { steps: 1, source: 'manual', updatedAt: NOW }))
    await assertFails(setDoc(doc(bob(), 'users/alice/health/2026-11-13'), { steps: 1, source: 'manual', updatedAt: NOW }))
  })
  it('favourites: owner only, addedAt only', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/favourites/a001'), { addedAt: NOW }))
    await assertFails(setDoc(doc(alice(), 'users/alice/favourites/a002'), { addedAt: NOW, note: 'x' }))
    await assertFails(setDoc(doc(bob(), 'users/alice/favourites/a001'), { addedAt: NOW }))
  })
})

describe('public content', () => {
  it('anyone can read affirmations and resources', async () => {
    await assertSucceeds(getDocs(collection(anon(), 'affirmations')))
    await assertSucceeds(getDocs(collection(anon(), 'resources')))
  })
  it('no client can write them', async () => {
    await assertFails(setDoc(doc(alice(), 'affirmations/x'), { text: 'hi', category: 'confidence', tags: [], active: true }))
    await assertFails(setDoc(doc(alice(), 'resources/x'), { name: 'Fake helpline', section: 'counselling' }))
    await assertFails(setDoc(doc(anon(), 'affirmations/x'), { text: 'hi' }))
  })
})

describe('suggestions', () => {
  const submit = (db: ReturnType<typeof alice>, uid: string, over: Record<string, unknown> = {}) => {
    const b = writeBatch(db)
    b.set(doc(db, `rateLimits/${uid}`), { lastSuggestionAt: serverTimestamp() })
    b.set(doc(collection(db, 'suggestions')), { text: 'I can do hard things', category: 'confidence', uid, createdAt: serverTimestamp(), status: 'pending', ...over })
    return b.commit()
  }

  it('signed-in verified user can submit once', async () => {
    await assertSucceeds(submit(alice(), 'alice'))
  })
  it('is rate limited to one per minute', async () => {
    await assertSucceeds(submit(alice(), 'alice'))
    await assertFails(submit(alice(), 'alice'))
  })
  it('cannot submit without the rate-limit stamp', async () => {
    const db = alice()
    await assertFails(setDoc(doc(db, 'suggestions/s1'), { text: 'I can do hard things', category: 'confidence', uid: 'alice', createdAt: serverTimestamp(), status: 'pending' }))
  })
  it('rejects anonymous, unverified, spoofed uid, pre-approved, or oversized suggestions', async () => {
    await assertFails(submit(anon(), 'alice'))
    await assertFails(submit(unverified(), 'alice'))
    await assertFails(submit(alice(), 'alice', { uid: 'bob' }))
    await assertFails(submit(alice(), 'alice', { status: 'approved' }))
    await assertFails(submit(alice(), 'alice', { text: 'x'.repeat(201) }))
    await assertFails(submit(alice(), 'alice', { category: 'wealth' }))
  })
  it('users read only their own suggestions and can never edit them', async () => {
    await assertSucceeds(submit(alice(), 'alice'))
    await assertSucceeds(getDocs(query(collection(alice(), 'suggestions'), where('uid', '==', 'alice'))))
    await assertFails(getDocs(collection(bob(), 'suggestions')))
    const mine = await getDocs(query(collection(alice(), 'suggestions'), where('uid', '==', 'alice')))
    await assertFails(updateDoc(mine.docs[0].ref, { status: 'approved' }))
    await assertSucceeds(deleteDoc(mine.docs[0].ref))
  })
  it("can't forge someone else's rate limit", async () => {
    await assertFails(setDoc(doc(alice(), 'rateLimits/bob'), { lastSuggestionAt: serverTimestamp() }))
  })
})

describe('default deny', () => {
  it('blocks unknown collections', async () => {
    await assertFails(setDoc(doc(alice(), 'schools/x'), { a: 1 }))
    await assertFails(getDocs(collection(alice(), 'schools')))
  })
})
