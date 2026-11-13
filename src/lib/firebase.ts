/**
 * Firebase is OPTIONAL: Unity works fully without an account. Firebase is only loaded
 * (dynamic import) when configured via .env and the user opts into an account.
 */
import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { isNative } from './platform'

const env = import.meta.env

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId)

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let services: Promise<FirebaseServices> | null = null

async function setupAppCheck(app: FirebaseApp) {
  const { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } = await import('firebase/app-check')
  if (env.DEV && env.VITE_APPCHECK_DEBUG_TOKEN) {
    ;(globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN
  }
  if (isNative()) {
    // Native: App Attest (iOS) / Play Integrity (Android) via the Capacitor plugin,
    // bridged into the JS SDK so Firestore and Auth requests carry a valid token.
    const { FirebaseAppCheck } = await import('@capacitor-firebase/app-check')
    await FirebaseAppCheck.initialize({ isTokenAutoRefreshEnabled: true })
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          const { token, expireTimeMillis } = await FirebaseAppCheck.getToken({ forceRefresh: false })
          return { token, expireTimeMillis: expireTimeMillis ?? Date.now() + 30 * 60_000 }
        },
      }),
      isTokenAutoRefreshEnabled: true,
    })
  } else if (env.VITE_RECAPTCHA_ENTERPRISE_KEY) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_KEY), isTokenAutoRefreshEnabled: true })
  }
}

export function getFirebase(): Promise<FirebaseServices> {
  if (!firebaseConfigured) return Promise.reject(new Error('Accounts are not set up in this build.'))
  services ??= (async () => {
    const { initializeApp } = await import('firebase/app')
    const app = initializeApp(config)
    try {
      await setupAppCheck(app)
    } catch {
      console.warn('App Check could not start')
    }
    const authMod = await import('firebase/auth')
    const auth = isNative()
      ? authMod.initializeAuth(app, { persistence: [authMod.indexedDBLocalPersistence] })
      : authMod.getAuth(app)
    const { initializeFirestore } = await import('firebase/firestore')
    const db = initializeFirestore(app, {})
    return { app, auth, db }
  })()
  return services
}
