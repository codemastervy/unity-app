import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Affirmation } from '../data/affirmations'
import { SEED_AFFIRMATIONS } from '../data/affirmations'
import type { Resource } from '../data/resources'
import { SEED_RESOURCES } from '../data/resources'
import { currentAccountUser, resolveStatus, runSync, type AccountStatus, type AccountUser } from '../lib/account'
import { cachedAffirmations, cachedResources, listFavouriteIds, refreshContent, setFavourite } from '../lib/content'
import { listEntries, type Entry } from '../lib/entries'
import { backend } from '../lib/backend'
import { listHealth } from '../lib/health'
import type { StoredHealth } from '../lib/db'
import { applyAppearance, DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../lib/settings'

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline'

interface AppState {
  ready: boolean
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
  entries: Entry[]
  health: StoredHealth[]
  refreshData: () => Promise<void>
  affirmations: Affirmation[]
  resources: Resource[]
  favourites: Set<string>
  toggleFavourite: (id: string) => Promise<void>
  user: AccountUser | null
  accountStatus: AccountStatus
  refreshAccount: () => Promise<void>
  syncState: SyncState
  lastSyncAt: number | null
  requestSync: () => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [entries, setEntries] = useState<Entry[]>([])
  const [health, setHealth] = useState<StoredHealth[]>([])
  const [affirmations, setAffirmations] = useState<Affirmation[]>(SEED_AFFIRMATIONS)
  const [resources, setResources] = useState<Resource[]>(SEED_RESOURCES)
  const [favourites, setFavourites] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<AccountUser | null>(null)
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('signed-out')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const settingsRef = useRef(settings)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncing = useRef(false)

  const refreshData = useCallback(async () => {
    const [e, h, f] = await Promise.all([listEntries(), listHealth(), listFavouriteIds()])
    setEntries(e)
    setHealth(h)
    setFavourites(f)
  }, [])

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setSettings(next)
    applyAppearance(next)
    await saveSettings(next)
    return next
  }, [])

  const doSync = useCallback(async () => {
    if (!user || accountStatus !== 'ready' || syncing.current) return
    if (!navigator.onLine) return setSyncState('offline')
    syncing.current = true
    setSyncState('syncing')
    try {
      await runSync(user.uid)
      setLastSyncAt(Date.now())
      setSyncState('idle')
      await refreshData()
    } catch {
      setSyncState('error')
    } finally {
      syncing.current = false
    }
  }, [user, accountStatus, refreshData])

  const requestSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => void doSync(), 1500)
  }, [doSync])

  const toggleFavourite = useCallback(
    async (id: string) => {
      await setFavourite(id, !favourites.has(id))
      setFavourites(await listFavouriteIds())
      requestSync()
    },
    [favourites, requestSync],
  )

  const refreshAccount = useCallback(async () => {
    const u = await currentAccountUser()
    setUser(u)
    try {
      setAccountStatus(await resolveStatus(u))
    } catch {
      setAccountStatus(u ? 'needs-unlock' : 'signed-out')
    }
  }, [])

  // Boot: settings → local data → cached content, then refresh live content in the background.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = await loadSettings()
      settingsRef.current = s
      if (cancelled) return
      setSettings(s)
      applyAppearance(s)
      const [a, r] = await Promise.all([cachedAffirmations(), cachedResources()])
      setAffirmations(a)
      setResources(r)
      await refreshData()
      setReady(true)
      const live = await refreshContent()
      if (live && !cancelled) {
        setAffirmations(live.affirmations)
        setResources(live.resources)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshData])

  // Follow system theme changes.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyAppearance(settingsRef.current)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Auth state (real Firebase, or the on-device simulated backend in demo mode).
  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false
    backend
      .onAuthChange(() => void refreshAccount())
      .then((u) => {
        if (cancelled) u()
        else unsub = u
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [refreshAccount])

  // Sync when ready, when coming back online, and when the app regains focus.
  useEffect(() => {
    if (accountStatus !== 'ready') return
    void doSync()
    const onFocus = () => document.visibilityState === 'visible' && void doSync()
    window.addEventListener('online', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('online', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [accountStatus, doSync])

  const value = useMemo<AppState>(
    () => ({
      ready,
      settings,
      updateSettings,
      entries,
      health,
      refreshData,
      affirmations,
      resources,
      favourites,
      toggleFavourite,
      user,
      accountStatus,
      refreshAccount,
      syncState,
      lastSyncAt,
      requestSync,
      helpOpen,
      setHelpOpen,
    }),
    [ready, settings, updateSettings, entries, health, refreshData, affirmations, resources, favourites, toggleFavourite, user, accountStatus, refreshAccount, syncState, lastSyncAt, requestSync, helpOpen],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
