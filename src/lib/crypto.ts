/**
 * Client-side encryption. Journal text, one-word entries and images are
 * encrypted with AES-GCM-256 using a per-user data key (DEK) BEFORE they are stored or
 * uploaded. For account sync the DEK is wrapped (AES-KW) with a key derived from the user's
 * sync passphrase (PBKDF2-SHA256), so Firestore only ever sees ciphertext.
 */

const subtle = globalThis.crypto.subtle
const enc = new TextEncoder()
const dec = new TextDecoder()

export const PBKDF2_ITERATIONS = 600_000
const VERSION = 'v1'
const KEY_CHECK_PLAINTEXT = 'unity-key-check'

export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return globalThis.crypto.getRandomValues(new Uint8Array(n))
}

export function generateDataKey(): Promise<CryptoKey> {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportRawKey(key: CryptoKey): Promise<string> {
  return toBase64(await subtle.exportKey('raw', key))
}

export function importRawKey(b64: string): Promise<CryptoKey> {
  return subtle.importKey('raw', fromBase64(b64), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

export async function encryptBytes(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const iv = randomBytes(12)
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, data))
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv)
  out.set(ct, iv.length)
  return out
}

export async function decryptBytes(key: CryptoKey, payload: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const iv = payload.subarray(0, 12)
  const ct = payload.subarray(12)
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct))
}

/** Encrypts a string to "v1:<base64(iv|ciphertext)>". Empty string stays empty. */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  if (!plaintext) return ''
  return `${VERSION}:${toBase64(await encryptBytes(key, enc.encode(plaintext)))}`
}

export async function decryptString(key: CryptoKey, payload: string): Promise<string> {
  if (!payload) return ''
  const [version, b64] = payload.split(':')
  if (version !== VERSION || !b64) throw new Error('Unsupported ciphertext format')
  return dec.decode(await decryptBytes(key, fromBase64(b64)))
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-KW', length: 256 }, false, [
    'wrapKey',
    'unwrapKey',
  ])
}

export interface KeyWrap {
  salt: string
  wrapped: string
  iter: number
}

export async function wrapDataKey(dek: CryptoKey, passphrase: string, iterations = PBKDF2_ITERATIONS): Promise<KeyWrap> {
  const salt = randomBytes(16)
  const kek = await deriveWrappingKey(passphrase, salt, iterations)
  const wrapped = await subtle.wrapKey('raw', dek, kek, 'AES-KW')
  return { salt: toBase64(salt), wrapped: toBase64(wrapped), iter: iterations }
}

/** Throws if the passphrase is wrong (AES-KW integrity check fails). */
export async function unwrapDataKey(wrap: KeyWrap, passphrase: string): Promise<CryptoKey> {
  const kek = await deriveWrappingKey(passphrase, fromBase64(wrap.salt), wrap.iter)
  return subtle.unwrapKey('raw', fromBase64(wrap.wrapped), kek, 'AES-KW', { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

export function makeKeyCheck(dek: CryptoKey): Promise<string> {
  return encryptString(dek, KEY_CHECK_PLAINTEXT)
}

export async function verifyKeyCheck(dek: CryptoKey, check: string): Promise<boolean> {
  try {
    return (await decryptString(dek, check)) === KEY_CHECK_PLAINTEXT
  } catch {
    return false
  }
}

/** PIN hashing for the app lock (PBKDF2, salted). */
export async function hashPin(pin: string, saltB64?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltB64 ? fromBase64(saltB64) : randomBytes(16)
  const base = await subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210_000 }, base, 256)
  return { hash: toBase64(bits), salt: toBase64(salt) }
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
