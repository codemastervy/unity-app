/** Tiny promise wrapper around IndexedDB — all of Unity's on-device data lives here. */
import type { MoodId } from './moods'

export const DB_NAME = 'unity'
const DB_VERSION = 1

export interface StoredEntry {
  id: string
  date: string // YYYY-MM-DD
  mood: MoodId
  stars: number // 0 = not rated, 1–5
  oneWordEnc: string
  journalEnc: string
  hasImage: boolean
  createdAt: number
  updatedAt: number
  /** Needs uploading on next sync. */
  dirty: boolean
  /** Has been uploaded at least once (so a remote absence means "deleted elsewhere"). */
  synced: boolean
  /** Tombstone, kept until the deletion has been synced. */
  deleted: boolean
}

export interface StoredImage {
  id: string // = entry id
  data: ArrayBuffer // AES-GCM iv|ciphertext
  type: string
}

export type HealthSource = 'manual' | 'healthkit' | 'healthconnect' | 'mixed'

export interface StoredHealth {
  date: string // key
  sleepHrs: number | null
  waterGlasses: number | null
  exerciseMins: number | null
  steps: number | null
  energy: number | null // 1–5
  source: HealthSource
  updatedAt: number
  dirty: boolean
}

export interface StoredFavourite {
  id: string // affirmation id
  addedAt: number
  deleted: boolean
  dirty: boolean
}

export type StoreName = 'entries' | 'images' | 'health' | 'favourites' | 'kv'
export const STORES: StoreName[] = ['entries', 'images', 'health', 'favourites', 'kv']

let dbPromise: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const p: Promise<IDBDatabase> = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('entries')) {
        const s = db.createObjectStore('entries', { keyPath: 'id' })
        s.createIndex('date', 'date')
      }
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('health')) db.createObjectStore('health', { keyPath: 'date' })
      if (!db.objectStoreNames.contains('favourites')) db.createObjectStore('favourites', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
    }
    req.onsuccess = () => {
      const db = req.result
      // The browser can close the connection on us (Safari does this after the tab is
      // backgrounded; another tab may delete/upgrade the DB). Forget it so the next call reopens.
      const forget = () => {
        if (dbPromise === p) dbPromise = null
      }
      db.onclose = forget
      db.onversionchange = () => {
        db.close()
        forget()
      }
      resolve(db)
    }
    req.onerror = () => {
      if (dbPromise === p) dbPromise = null
      reject(req.error)
    }
    // onblocked: another tab holds an old connection; the open completes once it closes.
  })
  dbPromise = p
  return p
}

/** Opens a transaction, reconnecting once if the cached connection was closed by the browser. */
async function transaction(names: StoreName, mode: IDBTransactionMode): Promise<IDBTransaction> {
  const db = await openDb()
  try {
    return db.transaction(names, mode)
  } catch (e) {
    if ((e as DOMException)?.name !== 'InvalidStateError') throw e
    if (dbPromise) {
      const stale = await dbPromise
      if (stale === db) dbPromise = null
    }
    return (await openDb()).transaction(names, mode)
  }
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function store(name: StoreName, mode: IDBTransactionMode) {
  return (await transaction(name, mode)).objectStore(name)
}

export async function getAll<T>(name: StoreName): Promise<T[]> {
  return promisify((await store(name, 'readonly')).getAll()) as Promise<T[]>
}

export async function get<T>(name: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return promisify((await store(name, 'readonly')).get(key)) as Promise<T | undefined>
}

export async function put<T>(name: StoreName, value: T, key?: IDBValidKey): Promise<void> {
  await promisify((await store(name, 'readwrite')).put(value, key))
}

export async function del(name: StoreName, key: IDBValidKey): Promise<void> {
  await promisify((await store(name, 'readwrite')).delete(key))
}

export async function clear(name: StoreName): Promise<void> {
  await promisify((await store(name, 'readwrite')).clear())
}

export async function putMany<T>(name: StoreName, values: T[]): Promise<void> {
  if (!values.length) return
  const tx = await transaction(name, 'readwrite')
  await new Promise<void>((resolve, reject) => {
    const s = tx.objectStore(name)
    for (const v of values) s.put(v)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export const kvGet = <T>(key: string) => get<T>('kv', key)
export const kvSet = <T>(key: string, value: T) => put('kv', value, key)
export const kvDel = (key: string) => del('kv', key)

/** Wipes every store and closes the DB (used by "Delete my data"). */
export async function wipeAll(): Promise<void> {
  for (const s of STORES) await clear(s)
  const db = await openDb()
  dbPromise = null
  db.close()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

/** For tests only. */
export function _resetDbForTests() {
  dbPromise = null
}
