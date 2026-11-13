/**
 * Holds the data encryption key (DEK).
 * - Native (iOS/Android): raw key kept in the Keychain / Android Keystore via secure storage.
 * - Web/PWA: CryptoKey object kept in IndexedDB (structured clone; never written as text).
 */
import { exportRawKey, generateDataKey, importRawKey } from './crypto'
import { kvDel, kvGet, kvSet } from './db'
import { isNative } from './platform'

const KEY_NAME = 'unity.dek'
let cached: CryptoKey | null = null

async function secure() {
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage')
  return SecureStorage
}

async function load(): Promise<CryptoKey | null> {
  if (isNative()) {
    const raw = await (await secure()).getItem(KEY_NAME)
    return raw ? importRawKey(raw) : null
  }
  return (await kvGet<CryptoKey>(KEY_NAME)) ?? null
}

async function save(key: CryptoKey): Promise<void> {
  if (isNative()) {
    await (await secure()).setItem(KEY_NAME, await exportRawKey(key))
  } else {
    await kvSet(KEY_NAME, key)
  }
}

/** Returns the DEK, creating one on first use. */
export async function getDataKey(): Promise<CryptoKey> {
  if (cached) return cached
  cached = await load()
  if (!cached) {
    cached = await generateDataKey()
    await save(cached)
  }
  return cached
}

/** Replace the DEK (e.g. after unlocking the account key on a new device). */
export async function setDataKey(key: CryptoKey): Promise<void> {
  await save(key)
  cached = key
}

export async function deleteDataKey(): Promise<void> {
  cached = null
  if (isNative()) await (await secure()).removeItem(KEY_NAME)
  else await kvDel(KEY_NAME)
}

export function _resetKeyCacheForTests() {
  cached = null
}
