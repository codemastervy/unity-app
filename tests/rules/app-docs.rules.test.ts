// Proves the documents Unity's own code produces are accepted by the rules.
import { assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { doc, setDoc } from 'firebase/firestore'
import { generateDataKey, makeKeyCheck, wrapDataKey } from '../../src/lib/crypto'
import { getAll, type StoredEntry, type StoredHealth } from '../../src/lib/db'
import { saveEntry } from '../../src/lib/entries'
import { saveHealth } from '../../src/lib/health'
import { DEFAULT_SETTINGS, syncableSettings } from '../../src/lib/settings'
import { ENTRY_FIELDS, HEALTH_FIELDS, pick } from '../../src/lib/sync'

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-unity', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } })
})
afterAll(() => env.cleanup())

describe('app-generated documents', () => {
  it('user doc, entries and health logs pass validation', async () => {
    const db = env.authenticatedContext('alice', { email_verified: true }).firestore()
    const dek = await generateDataKey()
    await assertSucceeds(
      setDoc(doc(db, 'users/alice'), {
        nickname: 'Al',
        createdAt: Date.now(),
        settings: syncableSettings(DEFAULT_SETTINGS),
        encKeyCheck: await makeKeyCheck(dek),
        keyWrap: await wrapDataKey(dek, 'a long passphrase'),
      }),
    )
    await saveEntry({ date: '2026-11-13', mood: 'sparkly', stars: 0, oneWord: 'Whānau', journal: 'x'.repeat(19000) })
    await saveEntry({ date: '2026-11-12', mood: 'sad', stars: 1, oneWord: 'tired', journal: '' })
    for (const e of await getAll<StoredEntry>('entries')) await assertSucceeds(setDoc(doc(db, `users/alice/entries/${e.id}`), pick(e, ENTRY_FIELDS)))
    await saveHealth('2026-11-13', { sleepHrs: 7.5, waterGlasses: 5 })
    await saveHealth('2026-11-12', { steps: 12000, energy: 4, exerciseMins: 45 }, 'healthkit')
    for (const h of await getAll<StoredHealth>('health')) await assertSucceeds(setDoc(doc(db, `users/alice/health/${h.date}`), pick(h, HEALTH_FIELDS)))
  })
})
