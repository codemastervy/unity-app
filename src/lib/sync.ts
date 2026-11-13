/**
 * Optional account sync. Last-write-wins by `updatedAt`.
 * Only ciphertext is uploaded for one-word / journal fields. Images never leave the device.
 */
import { decryptBytes, decryptString, encryptBytes, encryptString } from './crypto'
import { del, get, getAll, put, putMany, type StoredEntry, type StoredFavourite, type StoredHealth, type StoredImage } from './db'
import { backend, type WriteOp } from './backend'

export const ENTRY_FIELDS = ['date', 'mood', 'stars', 'oneWordEnc', 'journalEnc', 'createdAt', 'updatedAt'] as const
export const HEALTH_FIELDS = ['sleepHrs', 'waterGlasses', 'exerciseMins', 'steps', 'energy', 'source', 'updatedAt'] as const

export function pick<T extends object, K extends keyof T>(o: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>
  for (const k of keys) out[k] = o[k]
  return out
}

export async function syncAll(uid: string): Promise<void> {
  await syncEntries(uid)
  await syncHealth(uid)
  await syncFavourites(uid)
}

async function syncEntries(uid: string) {
  const col = `users/${uid}/entries`
  const local = await getAll<StoredEntry>('entries')
  const dirty = local.filter((e) => e.dirty)
  await backend.commit(dirty.map((e): WriteOp => (e.deleted ? { type: 'delete', path: `${col}/${e.id}` } : { type: 'set', path: `${col}/${e.id}`, data: pick(e, ENTRY_FIELDS) })))
  // Mark pushed rows clean, unless they were edited again while we were uploading.
  for (const e of dirty) {
    const cur = await get<StoredEntry>('entries', e.id)
    if (!cur || cur.updatedAt !== e.updatedAt) continue
    if (e.deleted) await del('entries', e.id)
    else await put<StoredEntry>('entries', { ...cur, dirty: false, synced: true })
  }

  const snap = await backend.listDocs(col)
  const remoteIds = new Set<string>()
  const after = new Map((await getAll<StoredEntry>('entries')).map((e) => [e.id, e]))
  const writes: StoredEntry[] = []
  for (const d of snap) {
    remoteIds.add(d.id)
    const r = d.data as Pick<StoredEntry, (typeof ENTRY_FIELDS)[number]>
    const l = after.get(d.id)
    if (!l) writes.push({ id: d.id, ...r, hasImage: false, dirty: false, synced: true, deleted: false })
    else if (!l.dirty && r.updatedAt > l.updatedAt) writes.push({ ...l, ...r, synced: true })
  }
  await putMany('entries', writes)
  for (const l of after.values()) {
    if (l.synced && !l.dirty && !remoteIds.has(l.id)) {
      await del('entries', l.id)
      await del('images', l.id)
    }
  }
}

async function syncHealth(uid: string) {
  const col = `users/${uid}/health`
  const local = await getAll<StoredHealth>('health')
  const dirty = local.filter((h) => h.dirty)
  await backend.commit(dirty.map((h): WriteOp => ({ type: 'set', path: `${col}/${h.date}`, data: pick(h, HEALTH_FIELDS) })))
  for (const h of dirty) {
    const cur = await get<StoredHealth>('health', h.date)
    if (cur && cur.updatedAt === h.updatedAt) await put<StoredHealth>('health', { ...cur, dirty: false })
  }
  const snap = await backend.listDocs(col)
  const map = new Map((await getAll<StoredHealth>('health')).map((h) => [h.date, h]))
  const writes: StoredHealth[] = []
  for (const d of snap) {
    const r = d.data as Pick<StoredHealth, (typeof HEALTH_FIELDS)[number]>
    const l = map.get(d.id)
    if (!l || (!l.dirty && r.updatedAt > l.updatedAt)) writes.push({ date: d.id, ...r, dirty: false })
  }
  await putMany('health', writes)
}

async function syncFavourites(uid: string) {
  const col = `users/${uid}/favourites`
  const local = await getAll<StoredFavourite>('favourites')
  const dirty = local.filter((f) => f.dirty)
  await backend.commit(dirty.map((f): WriteOp => (f.deleted ? { type: 'delete', path: `${col}/${f.id}` } : { type: 'set', path: `${col}/${f.id}`, data: { addedAt: f.addedAt } })))
  for (const f of dirty) {
    if (f.deleted) await del('favourites', f.id)
    else await put<StoredFavourite>('favourites', { ...f, dirty: false })
  }
  const snap = await backend.listDocs(col)
  const remote = new Map(snap.map((d) => [d.id, (d.data as { addedAt: number }).addedAt]))
  const now = await getAll<StoredFavourite>('favourites')
  const localIds = new Set(now.map((f) => f.id))
  for (const [id, addedAt] of remote) if (!localIds.has(id)) await put<StoredFavourite>('favourites', { id, addedAt, deleted: false, dirty: false })
  for (const f of now) if (!f.dirty && !remote.has(f.id)) await del('favourites', f.id)
}

/** Re-encrypts every local entry + image from one key to another (used when adopting the account key). */
export async function rekeyLocalData(oldKey: CryptoKey, newKey: CryptoKey): Promise<void> {
  const entries = await getAll<StoredEntry>('entries')
  for (const e of entries) {
    if (e.deleted) continue
    const oneWord = await decryptString(oldKey, e.oneWordEnc)
    const journal = await decryptString(oldKey, e.journalEnc)
    await put<StoredEntry>('entries', {
      ...e,
      oneWordEnc: await encryptString(newKey, oneWord),
      journalEnc: await encryptString(newKey, journal),
      dirty: true,
      updatedAt: Math.max(e.updatedAt, Date.now()),
    })
    if (e.hasImage) {
      const img = await get<StoredImage>('images', e.id)
      if (img) {
        const plain = await decryptBytes(oldKey, new Uint8Array(img.data))
        await put<StoredImage>('images', { ...img, data: (await encryptBytes(newKey, plain)).buffer })
      }
    }
  }
}
