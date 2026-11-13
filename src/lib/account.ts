/**
 * Optional accounts: email + password (with verification) or Google.
 * Nickname only — no real name. The journal key is protected by a separate sync passphrase
 * that never leaves the device, so even we can't read journal entries.
 */
import { makeKeyCheck, unwrapDataKey, verifyKeyCheck, wrapDataKey, type KeyWrap } from './crypto'
import { kvDel, kvGet, kvSet } from './db'
import { backend } from './backend'
import { getDataKey, setDataKey } from './keystore'
import { syncableSettings, type Settings } from './settings'
import { rekeyLocalData, syncAll } from './sync'

export type AccountStatus =
  | 'signed-out'
  | 'unverified' // email not verified yet
  | 'needs-setup' // first sign-in: choose a sync passphrase
  | 'needs-unlock' // new device: enter sync passphrase
  | 'ready'

export interface AccountUser {
  uid: string
  email: string | null
  emailVerified: boolean
  provider: 'password' | 'google' | 'other'
}

interface UserDoc {
  nickname: string
  createdAt: number
  settings: Record<string, unknown>
  encKeyCheck: string
  keyWrap: KeyWrap
}

const UNLOCKED_UID = 'account.unlockedUid'

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/invalid-email': 'That email doesn’t look right.',
    'auth/email-already-in-use': 'There’s already an account with that email. Try signing in.',
    'auth/weak-password': 'Pick a stronger password (at least 8 characters).',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection right now.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/requires-recent-login': 'For your safety, please sign in again first.',
    'permission-denied': 'Something went wrong saving to your account.',
  }
  return map[code] ?? 'Something went wrong. Please try again.'
}

export async function signUpEmail(email: string, password: string) {
  if (password.length < 8) throw Object.assign(new Error(), { code: 'auth/weak-password' })
  await backend.signUp(email.trim(), password)
}

export async function signInEmail(email: string, password: string) {
  await backend.signIn(email.trim(), password)
}

export const googleSignInSupported = () => backend.googleSupported

export const signInGoogle = () => backend.signInGoogle()
export const resetPassword = (email: string) => backend.resetPassword(email.trim())
export const resendVerification = () => backend.sendVerification()
/** Reloads the user and refreshes the ID token so rules see email_verified = true. */
export const refreshVerification = () => backend.reloadVerified()
export const setSessionOnly = (on: boolean) => backend.setSessionOnly(on)
export const currentAccountUser = (): Promise<AccountUser | null> => backend.currentUser()

export async function signOut() {
  await backend.signOut()
  await kvDel(UNLOCKED_UID)
}

const userPath = (uid: string) => `users/${uid}`

/** Works out what the signed-in user still needs to do before sync can run. */
export async function resolveStatus(user: AccountUser | null): Promise<AccountStatus> {
  if (!user) return 'signed-out'
  if (!user.emailVerified) return 'unverified'
  if ((await kvGet<string>(UNLOCKED_UID)) === user.uid) return 'ready'
  const data = (await backend.getDoc(userPath(user.uid))) as UserDoc | null
  if (!data) return 'needs-setup'
  if (await verifyKeyCheck(await getDataKey(), data.encKeyCheck)) {
    await kvSet(UNLOCKED_UID, user.uid)
    return 'ready'
  }
  return 'needs-unlock'
}

export const PASSPHRASE_MIN = 8

/** First sign-in: protect this device's journal key with a passphrase and create the user doc. */
export async function setupPassphrase(uid: string, passphrase: string, settings: Settings) {
  if (passphrase.length < PASSPHRASE_MIN) throw new Error(`Use at least ${PASSPHRASE_MIN} characters.`)
  const dek = await getDataKey()
  const docData: UserDoc = {
    nickname: settings.nickname.slice(0, 30),
    createdAt: Date.now(),
    settings: syncableSettings(settings),
    encKeyCheck: await makeKeyCheck(dek),
    keyWrap: await wrapDataKey(dek, passphrase),
  }
  await backend.setDoc(userPath(uid), { ...docData })
  await kvSet(UNLOCKED_UID, uid)
}

/** New device: unlock the account key with the passphrase and re-encrypt local data with it. */
export async function unlockWithPassphrase(uid: string, passphrase: string) {
  const data = (await backend.getDoc(userPath(uid))) as UserDoc | null
  if (!data) throw new Error('Account data not found.')
  let accountKey: CryptoKey
  try {
    accountKey = await unwrapDataKey(data.keyWrap, passphrase)
  } catch {
    throw new Error('That passphrase doesn’t match. Try again.')
  }
  if (!(await verifyKeyCheck(accountKey, data.encKeyCheck))) throw new Error('That passphrase doesn’t match. Try again.')
  const localKey = await getDataKey()
  await rekeyLocalData(localKey, accountKey)
  await setDataKey(accountKey)
  await kvSet(UNLOCKED_UID, uid)
}

/** Change the sync passphrase (re-wraps the same key). */
export async function changePassphrase(uid: string, newPassphrase: string) {
  if (newPassphrase.length < PASSPHRASE_MIN) throw new Error(`Use at least ${PASSPHRASE_MIN} characters.`)
  await backend.updateDoc(userPath(uid), { keyWrap: await wrapDataKey(await getDataKey(), newPassphrase) })
}

export async function pushProfile(uid: string, settings: Settings) {
  await backend.updateDoc(userPath(uid), { nickname: settings.nickname.slice(0, 30), settings: syncableSettings(settings) })
}

export async function runSync(uid: string) {
  await syncAll(uid)
}

/** Re-authenticate before deleting the account. */
export const reauthenticate = (user: AccountUser, password?: string) => backend.reauth(user, password)

/** Deletes everything stored remotely for this user, then the auth account itself. */
export async function deleteRemoteAccount(uid: string) {
  for (const sub of ['entries', 'health', 'favourites']) {
    const docs = await backend.listDocs(`users/${uid}/${sub}`)
    await backend.commit(docs.map((d) => ({ type: 'delete' as const, path: `users/${uid}/${sub}/${d.id}` })))
  }
  for (const d of await backend.listSuggestions(uid)) await backend.deleteDoc(`suggestions/${d.id}`).catch(() => undefined)
  await backend.deleteDoc(`rateLimits/${uid}`).catch(() => undefined)
  await backend.deleteDoc(userPath(uid))
  await backend.deleteCurrentUser()
  await kvDel(UNLOCKED_UID)
}
