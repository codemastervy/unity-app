import { beforeEach, describe, expect, it } from 'vitest'
import { getAll, wipeAll, type StoredEntry } from './db'
import { deleteEntry, getEntry, listEntries, saveEntry, validateEntry } from './entries'
import { _resetKeyCacheForTests } from './keystore'

beforeEach(async () => {
  await wipeAll()
  _resetKeyCacheForTests()
})

const base = { date: '2026-11-13', mood: 'good' as const, stars: 4, oneWord: 'Sunny', journal: 'Went to the beach with my mates' }

describe('entries', () => {
  it('requires one word and an emoji', () => {
    expect(validateEntry({ ...base, oneWord: '  ' })).toMatch(/one word/i)
    expect(validateEntry({ ...base, mood: '' as never })).toMatch(/emoji/i)
    expect(validateEntry(base)).toBeNull()
  })

  it('stores text encrypted and reads it back', async () => {
    const id = await saveEntry(base)
    const raw = (await getAll<StoredEntry>('entries'))[0]
    expect(JSON.stringify(raw)).not.toContain('Sunny')
    expect(JSON.stringify(raw)).not.toContain('beach')
    expect(raw.dirty).toBe(true)
    const e = await getEntry(id)
    expect(e?.oneWord).toBe('Sunny')
    expect(e?.journal).toBe('Went to the beach with my mates')
  })

  it('edits and deletes', async () => {
    const id = await saveEntry(base)
    await saveEntry({ ...base, oneWord: 'Rainy' }, id)
    expect((await listEntries()).map((e) => e.oneWord)).toEqual(['Rainy'])
    await deleteEntry(id)
    expect(await listEntries()).toHaveLength(0)
    expect(await getAll('entries')).toHaveLength(0) // never synced → removed outright
  })

  it('keeps a tombstone for synced entries', async () => {
    const id = await saveEntry(base)
    const { put } = await import('./db')
    const row = (await getAll<StoredEntry>('entries'))[0]
    await put('entries', { ...row, synced: true, dirty: false })
    await deleteEntry(id)
    const [t] = await getAll<StoredEntry>('entries')
    expect(t.deleted && t.dirty).toBe(true)
    expect(t.oneWordEnc).toBe('')
  })
})

describe('db reconnect', () => {
  it('recovers when the browser closes the connection', async () => {
    const { openDb } = await import('./db')
    await saveEntry(base)
    const db = await openDb()
    db.close() // simulate Safari / another tab closing it (no close event fires for an explicit close)
    expect(await listEntries()).toHaveLength(1)
  })
})
