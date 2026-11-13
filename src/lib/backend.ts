/**
 * The account/sync backend Unity talks to.
 *
 * - `firebase`: real Firebase Auth + Firestore (used when .env has a Firebase config).
 * - `demo`: a SIMULATED Firebase that lives entirely in this browser. Used for the GitHub Pages
 *   demo and local dev until the real Firebase project exists. Nothing is sent anywhere.
 *   It mimics the real behaviour closely enough to try every flow: sign up, verify email,
 *   journal passphrase, sync to a second "device", suggestions with rate limiting, delete account.
 */
import { constantTimeEqual, hashPin } from './crypto'
import { firebaseConfigured, getFirebase } from './firebase'

export interface RawUser {
  uid: string
  email: string | null
  emailVerified: boolean
  provider: 'password' | 'google' | 'other'
}

export type WriteOp = { type: 'set'; path: string; data: Record<string, unknown> } | { type: 'delete'; path: string }
export interface RemoteDoc {
  id: string
  data: Record<string, unknown>
}

export interface Backend {
  kind: 'firebase' | 'demo'
  googleSupported: boolean
  currentUser(): Promise<RawUser | null>
  onAuthChange(cb: () => void): Promise<() => void>
  signUp(email: string, password: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signInGoogle(): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  sendVerification(): Promise<void>
  reloadVerified(): Promise<boolean>
  reauth(user: RawUser, password?: string): Promise<void>
  deleteCurrentUser(): Promise<void>
  setSessionOnly(on: boolean): Promise<void>
  getDoc(path: string): Promise<Record<string, unknown> | null>
  setDoc(path: string, data: Record<string, unknown>): Promise<void>
  updateDoc(path: string, patch: Record<string, unknown>): Promise<void>
  deleteDoc(path: string): Promise<void>
  listDocs(collectionPath: string): Promise<RemoteDoc[]>
  commit(ops: WriteOp[]): Promise<void>
  submitSuggestion(uid: string, text: string, category: string): Promise<void>
  listSuggestions(uid: string): Promise<RemoteDoc[]>
}

const codeError = (code: string) => Object.assign(new Error(code), { code })

// ---------------------------------------------------------------------------------------
// Real Firebase

const firebaseBackend: Backend = {
  kind: 'firebase',
  googleSupported: true,
  async currentUser() {
    const { auth } = await getFirebase()
    const u = auth.currentUser
    if (!u) return null
    const p = u.providerData[0]?.providerId
    return { uid: u.uid, email: u.email, emailVerified: u.emailVerified, provider: p === 'password' ? 'password' : p === 'google.com' ? 'google' : 'other' }
  },
  async onAuthChange(cb) {
    const { auth } = await getFirebase()
    const { onAuthStateChanged } = await import('firebase/auth')
    return onAuthStateChanged(auth, () => cb())
  },
  async signUp(email, password) {
    const { auth } = await getFirebase()
    const a = await import('firebase/auth')
    const cred = await a.createUserWithEmailAndPassword(auth, email, password)
    await a.sendEmailVerification(cred.user)
  },
  async signIn(email, password) {
    const { auth } = await getFirebase()
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    await signInWithEmailAndPassword(auth, email, password)
  },
  async signInGoogle() {
    const { auth } = await getFirebase()
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(auth, provider)
  },
  async signOut() {
    const { auth } = await getFirebase()
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
  },
  async resetPassword(email) {
    const { auth } = await getFirebase()
    const { sendPasswordResetEmail } = await import('firebase/auth')
    await sendPasswordResetEmail(auth, email)
  },
  async sendVerification() {
    const { auth } = await getFirebase()
    const { sendEmailVerification } = await import('firebase/auth')
    if (auth.currentUser) await sendEmailVerification(auth.currentUser)
  },
  async reloadVerified() {
    const { auth } = await getFirebase()
    if (!auth.currentUser) return false
    await auth.currentUser.reload()
    await auth.currentUser.getIdToken(true)
    return auth.currentUser.emailVerified
  },
  async reauth(user, password) {
    const { auth } = await getFirebase()
    const a = await import('firebase/auth')
    if (!auth.currentUser) throw new Error('Not signed in')
    if (user.provider === 'password') {
      if (!password) throw new Error('Enter your password to continue.')
      await a.reauthenticateWithCredential(auth.currentUser, a.EmailAuthProvider.credential(user.email ?? '', password))
    } else if (user.provider === 'google') {
      await a.reauthenticateWithPopup(auth.currentUser, new a.GoogleAuthProvider())
    }
  },
  async deleteCurrentUser() {
    const { auth } = await getFirebase()
    const { deleteUser } = await import('firebase/auth')
    if (auth.currentUser) await deleteUser(auth.currentUser)
  },
  async setSessionOnly(on) {
    const { auth } = await getFirebase()
    const a = await import('firebase/auth')
    await a.setPersistence(auth, on ? a.browserSessionPersistence : a.browserLocalPersistence)
  },
  async getDoc(path) {
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, path))
    return snap.exists() ? snap.data() : null
  },
  async setDoc(path, data) {
    const { db } = await getFirebase()
    const { doc, setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, path), data)
  },
  async updateDoc(path, patch) {
    const { db } = await getFirebase()
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, path), patch)
  },
  async deleteDoc(path) {
    const { db } = await getFirebase()
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, path))
  },
  async listDocs(collectionPath) {
    const { db } = await getFirebase()
    const { collection, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(collection(db, collectionPath))
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }))
  },
  async commit(ops) {
    const { db } = await getFirebase()
    const fs = await import('firebase/firestore')
    for (let i = 0; i < ops.length; i += 400) {
      const batch = fs.writeBatch(db)
      for (const op of ops.slice(i, i + 400)) {
        if (op.type === 'set') batch.set(fs.doc(db, op.path), op.data)
        else batch.delete(fs.doc(db, op.path))
      }
      await batch.commit()
    }
  },
  async submitSuggestion(uid, text, category) {
    const { db } = await getFirebase()
    const fs = await import('firebase/firestore')
    const batch = fs.writeBatch(db)
    batch.set(fs.doc(db, 'rateLimits', uid), { lastSuggestionAt: fs.serverTimestamp() })
    batch.set(fs.doc(fs.collection(db, 'suggestions')), { text, category, uid, createdAt: fs.serverTimestamp(), status: 'pending' })
    await batch.commit()
  },
  async listSuggestions(uid) {
    const { db } = await getFirebase()
    const fs = await import('firebase/firestore')
    const snap = await fs.getDocs(fs.query(fs.collection(db, 'suggestions'), fs.where('uid', '==', uid)))
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }))
  },
}

// ---------------------------------------------------------------------------------------
// Simulated Firebase (demo). "Cloud" = a separate IndexedDB database in this browser.

const CLOUD_DB = 'unity-demo-cloud'
const AUTH_KEY = 'unity-demo-auth'

interface DemoAccount {
  uid: string
  hash: string
  salt: string
  verified: boolean
}
interface DemoAuthState {
  users: Record<string, DemoAccount>
  currentEmail: string | null
}

function readAuth(): DemoAuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY)
    if (raw) return JSON.parse(raw) as DemoAuthState
  } catch {
    /* storage unavailable */
  }
  return { users: {}, currentEmail: null }
}
let sessionOnly = false
function writeAuth(s: DemoAuthState) {
  try {
    // Accounts persist; "sign out when I close" keeps only the session in sessionStorage.
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessionOnly ? { ...s, currentEmail: null } : s))
    if (sessionOnly) sessionStorage.setItem(AUTH_KEY, JSON.stringify(s))
    else sessionStorage.removeItem(AUTH_KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb())
}
const listeners = new Set<() => void>()

let cloudPromise: Promise<IDBDatabase> | null = null
function cloud(): Promise<IDBDatabase> {
  cloudPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(CLOUD_DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('docs')
    req.onsuccess = () => {
      const db = req.result
      db.onclose = db.onversionchange = () => {
        cloudPromise = null
      }
      resolve(db)
    }
    req.onerror = () => {
      cloudPromise = null
      reject(req.error)
    }
  })
  return cloudPromise
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await cloud()
  return new Promise((resolve, reject) => {
    const t = db.transaction('docs', mode)
    const r = fn(t.objectStore('docs'))
    t.oncomplete = () => resolve(r ? r.result : undefined)
    t.onerror = () => reject(t.error)
  })
}

const pause = () => new Promise((r) => setTimeout(r, 250)) // feel like a network round-trip

function demoCurrent(): RawUser | null {
  const s = readAuth()
  const acct = s.currentEmail ? s.users[s.currentEmail] : undefined
  return acct && s.currentEmail ? { uid: acct.uid, email: s.currentEmail, emailVerified: acct.verified, provider: 'password' } : null
}

/** Mimics the Firestore rules: you may only touch your own users/{uid}/** and rateLimits/{uid}. */
function guard(path: string) {
  const me = demoCurrent()
  const [root, id] = path.split('/')
  if (!me?.emailVerified) throw codeError('permission-denied')
  if ((root === 'users' || root === 'rateLimits') && id !== me.uid) throw codeError('permission-denied')
  if (root === 'affirmations' || root === 'resources') throw codeError('permission-denied')
}

const demoBackend: Backend = {
  kind: 'demo',
  googleSupported: false,
  async currentUser() {
    return demoCurrent()
  },
  async onAuthChange(cb) {
    listeners.add(cb)
    queueMicrotask(cb)
    return () => listeners.delete(cb)
  },
  async signUp(email, password) {
    await pause()
    const s = readAuth()
    const key = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) throw codeError('auth/invalid-email')
    if (s.users[key]) throw codeError('auth/email-already-in-use')
    const { hash, salt } = await hashPin(password)
    s.users[key] = { uid: `demo-${crypto.randomUUID()}`, hash, salt, verified: false }
    s.currentEmail = key
    writeAuth(s)
  },
  async signIn(email, password) {
    await pause()
    const s = readAuth()
    const key = email.trim().toLowerCase()
    const acct = s.users[key]
    if (!acct || !constantTimeEqual((await hashPin(password, acct.salt)).hash, acct.hash)) throw codeError('auth/invalid-credential')
    s.currentEmail = key
    writeAuth(s)
  },
  async signInGoogle() {
    throw codeError('auth/operation-not-supported-in-this-environment')
  },
  async signOut() {
    const s = readAuth()
    s.currentEmail = null
    writeAuth(s)
  },
  async resetPassword() {
    await pause() // no email in the demo
  },
  async sendVerification() {
    await pause()
  },
  async reloadVerified() {
    // Demo: pressing "I've verified" counts as clicking the email link.
    await pause()
    const s = readAuth()
    if (!s.currentEmail) return false
    s.users[s.currentEmail].verified = true
    writeAuth(s)
    return true
  },
  async reauth(user, password) {
    if (!user.email) throw new Error('Not signed in')
    if (!password) throw new Error('Enter your password to continue.')
    const acct = readAuth().users[user.email]
    if (!acct || !constantTimeEqual((await hashPin(password, acct.salt)).hash, acct.hash)) throw codeError('auth/invalid-credential')
  },
  async deleteCurrentUser() {
    const s = readAuth()
    if (s.currentEmail) delete s.users[s.currentEmail]
    s.currentEmail = null
    writeAuth(s)
  },
  async setSessionOnly(on) {
    sessionOnly = on
    writeAuth(readAuth())
  },
  async getDoc(path) {
    guard(path)
    return ((await tx('readonly', (st) => st.get(path))) as Record<string, unknown> | undefined) ?? null
  },
  async setDoc(path, data) {
    guard(path)
    await pause()
    await tx('readwrite', (st) => {
      st.put(structuredClone(data), path)
    })
  },
  async updateDoc(path, patch) {
    const cur = await this.getDoc(path)
    if (!cur) throw codeError('not-found')
    await this.setDoc(path, { ...cur, ...patch })
  },
  async deleteDoc(path) {
    guard(path)
    await tx('readwrite', (st) => {
      st.delete(path)
    })
  },
  async listDocs(collectionPath) {
    guard(collectionPath)
    const depth = collectionPath.split('/').length + 1
    const range = IDBKeyRange.bound(`${collectionPath}/`, `${collectionPath}/￿`)
    const keys = ((await tx('readonly', (st) => st.getAllKeys(range))) ?? []) as string[]
    const vals = ((await tx('readonly', (st) => st.getAll(range))) ?? []) as Record<string, unknown>[]
    return keys.map((k, i) => ({ k, v: vals[i] })).filter(({ k }) => k.split('/').length === depth).map(({ k, v }) => ({ id: k.split('/').pop()!, data: v }))
  },
  async commit(ops) {
    ops.forEach((op) => guard(op.path))
    await pause()
    await tx('readwrite', (st) => {
      for (const op of ops) {
        if (op.type === 'set') st.put(structuredClone(op.data), op.path)
        else st.delete(op.path)
      }
    })
  },
  async submitSuggestion(uid, text, category) {
    guard(`rateLimits/${uid}`)
    await pause()
    const rl = (await tx('readonly', (st) => st.get(`rateLimits/${uid}`))) as { lastSuggestionAt: number } | undefined
    if (rl && Date.now() - rl.lastSuggestionAt < 60_000) throw codeError('permission-denied')
    const now = Date.now()
    await tx('readwrite', (st) => {
      st.put({ lastSuggestionAt: now }, `rateLimits/${uid}`)
      st.put({ text, category, uid, createdAt: now, status: 'pending' }, `suggestions/${crypto.randomUUID()}`)
    })
  },
  async listSuggestions(uid) {
    const all = await tx('readonly', (st) => st.getAllKeys(IDBKeyRange.bound('suggestions/', 'suggestions/￿')))
    const out: RemoteDoc[] = []
    for (const k of (all ?? []) as string[]) {
      const d = (await tx('readonly', (st) => st.get(k))) as Record<string, unknown>
      if (d.uid === uid) out.push({ id: k.split('/')[1], data: d })
    }
    return out
  },
}

export const backend: Backend = firebaseConfigured ? firebaseBackend : demoBackend
export const isDemoBackend = backend.kind === 'demo'
