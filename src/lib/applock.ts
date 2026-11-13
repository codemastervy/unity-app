/** App lock: PIN (all platforms) + Face ID / fingerprint (native apps). */
import { constantTimeEqual, hashPin } from './crypto'
import { kvGet, kvSet } from './db'
import { isNative } from './platform'

export const PIN_RE = /^\d{4,6}$/

export async function makePin(pin: string) {
  if (!PIN_RE.test(pin)) throw new Error('PIN must be 4–6 digits.')
  return hashPin(pin)
}

export async function checkPin(pin: string, hash: string, salt: string): Promise<boolean> {
  const { hash: h } = await hashPin(pin, salt)
  return constantTimeEqual(h, hash)
}

// Brute-force protection: escalating wait after 5 wrong attempts.
const ATTEMPTS_KEY = 'lock.attempts'
interface Attempts {
  count: number
  until: number
}

export async function lockoutRemainingMs(): Promise<number> {
  const a = (await kvGet<Attempts>(ATTEMPTS_KEY)) ?? { count: 0, until: 0 }
  return Math.max(0, a.until - Date.now())
}

export async function recordAttempt(ok: boolean): Promise<void> {
  if (ok) return kvSet<Attempts>(ATTEMPTS_KEY, { count: 0, until: 0 })
  const a = (await kvGet<Attempts>(ATTEMPTS_KEY)) ?? { count: 0, until: 0 }
  const count = a.count + 1
  const wait = count >= 5 ? Math.min(30_000 * 2 ** (count - 5), 30 * 60_000) : 0
  await kvSet<Attempts>(ATTEMPTS_KEY, { count, until: Date.now() + wait })
}

export async function biometryAvailable(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    return (await BiometricAuth.checkBiometry()).isAvailable
  } catch {
    return false
  }
}

export async function biometricUnlock(): Promise<boolean> {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    await BiometricAuth.authenticate({ reason: 'Unlock Unity', cancelTitle: 'Use PIN', allowDeviceCredential: false, androidTitle: 'Unlock Unity' })
    return true
  } catch {
    return false
  }
}
