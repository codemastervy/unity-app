import { kvGet, kvSet } from './db'

export type Theme = 'system' | 'light' | 'dark'
export type TextScale = 1 | 1.125 | 1.25 | 1.4

export interface Settings {
  nickname: string
  theme: Theme
  textScale: TextScale
  consentVersion: number | null
  consentAt: number | null
  reminder: { enabled: boolean; hour: number; minute: number }
  lock: { enabled: boolean; pinHash: string; pinSalt: string; biometric: boolean; timeoutMins: number }
  healthSync: boolean
  /** Sign out of the account when the app/browser closes. */
  signOutOnClose: boolean
  /** Date (YYYY-MM-DD) the low-mood support card was last dismissed. */
  lowMoodDismissedOn: string | null
}

export const CONSENT_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  nickname: '',
  theme: 'system',
  textScale: 1,
  consentVersion: null,
  consentAt: null,
  reminder: { enabled: false, hour: 20, minute: 0 },
  lock: { enabled: false, pinHash: '', pinSalt: '', biometric: false, timeoutMins: 1 },
  healthSync: false,
  signOutOnClose: false,
  lowMoodDismissedOn: null,
}

const KEY = 'settings'

export async function loadSettings(): Promise<Settings> {
  const s = await kvGet<Partial<Settings>>(KEY)
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    reminder: { ...DEFAULT_SETTINGS.reminder, ...s?.reminder },
    lock: { ...DEFAULT_SETTINGS.lock, ...s?.lock },
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await kvSet(KEY, s)
}

/** Settings that are safe to sync to the account (no PIN hash, no device-only flags). */
export function syncableSettings(s: Settings) {
  return { theme: s.theme, textScale: s.textScale, reminderHour: s.reminder.hour, reminderMinute: s.reminder.minute }
}

export function applyAppearance(s: Pick<Settings, 'theme' | 'textScale'>) {
  const root = document.documentElement
  const dark = s.theme === 'dark' || (s.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.style.setProperty('--text-scale', String(s.textScale))
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121212' : '#FFFFFF')
}
