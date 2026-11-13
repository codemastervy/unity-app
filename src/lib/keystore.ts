/**
 * Holds the data encryption key (DEK) as a non-extractable-by-text CryptoKey object in IndexedDB
 * (structured clone; never written out as text).
 */
import { generateDataKey } from './crypto'
import { kvDel, kvGet, kvSet } from './db'

const KEY_NAME = 'unity.dek'
let cached: CryptoKey | null = null

/** Returns the DEK, creating one on first use. */
export async function getDataKey(): Promise<CryptoKey> {
  if (cached) return cached
  cached = (await kvGet<CryptoKey>(KEY_NAME)) ?? null
  if (!cached) {
    cached = await generateDataKey()
    await kvSet(KEY_NAME, cached)
  }
  return cached
}

/** Replace the DEK (e.g. after unlocking the account key on a new device). */
export async function setDataKey(key: CryptoKey): Promise<void> {
  await kvSet(KEY_NAME, key)
  cached = key
}

export async function deleteDataKey(): Promise<void> {
  cached = null
  await kvDel(KEY_NAME)
}

export function _resetKeyCacheForTests() {
  cached = null
}
