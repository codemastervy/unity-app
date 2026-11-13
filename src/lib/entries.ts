/** Journal entries: encrypted at rest on the device, decrypted only for display. */
import { decryptBytes, decryptString, encryptBytes, encryptString } from './crypto'
import { del, get, getAll, put, type StoredEntry, type StoredImage } from './db'
import { getDataKey } from './keystore'
import type { MoodId } from './moods'
import { newId } from './platform'

export interface EntryInput {
  date: string
  mood: MoodId
  stars: number
  oneWord: string
  journal: string
  /** undefined = keep existing image, null = remove image */
  image?: Blob | null
}

export interface Entry {
  id: string
  date: string
  mood: MoodId
  stars: number
  oneWord: string
  journal: string
  hasImage: boolean
  createdAt: number
  updatedAt: number
}

export const LIMITS = { oneWord: 40, journal: 20000 }

export function validateEntry(input: EntryInput): string | null {
  const word = input.oneWord.trim()
  if (!word) return 'Add one word to remember today.'
  if (word.length > LIMITS.oneWord) return `Keep your word under ${LIMITS.oneWord} characters.`
  if (input.journal.length > LIMITS.journal) return 'Your scribble is a bit long — try splitting it into two entries.'
  if (!input.mood) return 'Pick an emoji that describes today.'
  if (input.stars < 0 || input.stars > 5) return 'Rating must be 0–5 stars.'
  return null
}

/** Lists live entries (no tombstones), newest first. Decrypts the one-word field only. */
export async function listEntries(): Promise<Entry[]> {
  const key = await getDataKey()
  const rows = (await getAll<StoredEntry>('entries')).filter((e) => !e.deleted)
  const out = await Promise.all(
    rows.map(async (e) => ({ ...toEntry(e), oneWord: await safeDecrypt(key, e.oneWordEnc), journal: '' })),
  )
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)
}

export async function getEntry(id: string): Promise<Entry | null> {
  const e = await get<StoredEntry>('entries', id)
  if (!e || e.deleted) return null
  const key = await getDataKey()
  return { ...toEntry(e), oneWord: await safeDecrypt(key, e.oneWordEnc), journal: await safeDecrypt(key, e.journalEnc) }
}

export async function saveEntry(input: EntryInput, id?: string): Promise<string> {
  const err = validateEntry(input)
  if (err) throw new Error(err)
  const key = await getDataKey()
  const now = Date.now()
  const existing = id ? await get<StoredEntry>('entries', id) : undefined
  const entryId = existing?.id ?? newId()

  let hasImage = existing?.hasImage ?? false
  if (input.image === null) {
    await del('images', entryId)
    hasImage = false
  } else if (input.image) {
    const data = await encryptBytes(key, new Uint8Array(await input.image.arrayBuffer()))
    await put<StoredImage>('images', { id: entryId, data: data.buffer, type: input.image.type || 'image/jpeg' })
    hasImage = true
  }

  const row: StoredEntry = {
    id: entryId,
    date: input.date,
    mood: input.mood,
    stars: Math.round(input.stars),
    oneWordEnc: await encryptString(key, input.oneWord.trim()),
    journalEnc: await encryptString(key, input.journal),
    hasImage,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    dirty: true,
    synced: existing?.synced ?? false,
    deleted: false,
  }
  await put('entries', row)
  return entryId
}

export async function deleteEntry(id: string): Promise<void> {
  const e = await get<StoredEntry>('entries', id)
  await del('images', id)
  if (!e) return
  if (e.synced) {
    // keep a tombstone so the deletion syncs
    await put<StoredEntry>('entries', { ...e, oneWordEnc: '', journalEnc: '', hasImage: false, deleted: true, dirty: true, updatedAt: Date.now() })
  } else {
    await del('entries', id)
  }
}

/** Returns an object URL for the entry's image (caller must revoke it). */
export async function getEntryImageUrl(id: string): Promise<string | null> {
  const img = await get<StoredImage>('images', id)
  if (!img) return null
  const key = await getDataKey()
  const bytes = await decryptBytes(key, new Uint8Array(img.data))
  return URL.createObjectURL(new Blob([bytes], { type: img.type }))
}

function toEntry(e: StoredEntry): Omit<Entry, 'oneWord' | 'journal'> {
  return { id: e.id, date: e.date, mood: e.mood, stars: e.stars, hasImage: e.hasImage, createdAt: e.createdAt, updatedAt: e.updatedAt }
}

async function safeDecrypt(key: CryptoKey, payload: string): Promise<string> {
  try {
    return await decryptString(key, payload)
  } catch {
    return '🔒'
  }
}

/** Downscale a picked photo so it stays small on the device. */
export async function prepareImage(file: File, maxSize = 1600): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85))
}
