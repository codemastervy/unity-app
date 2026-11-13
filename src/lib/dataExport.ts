/** NZ Privacy Act 2020 user rights: export everything, delete everything. */
import { getAll, wipeAll, type StoredFavourite, type StoredHealth } from './db'
import { getEntry, listEntries } from './entries'
import { deleteDataKey } from './keystore'
import { cancelDailyReminder } from './notifications'
import { isNative } from './platform'
import { loadSettings } from './settings'

export async function buildExport() {
  const settings = await loadSettings()
  const list = await listEntries()
  const entries = []
  for (const e of list) {
    const full = await getEntry(e.id)
    if (full) entries.push({ date: full.date, mood: full.mood, stars: full.stars, oneWord: full.oneWord, journal: full.journal, createdAt: new Date(full.createdAt).toISOString(), updatedAt: new Date(full.updatedAt).toISOString() })
  }
  const health = (await getAll<StoredHealth>('health')).map((h) => ({ date: h.date, sleepHrs: h.sleepHrs, waterGlasses: h.waterGlasses, exerciseMins: h.exerciseMins, steps: h.steps, energy: h.energy, source: h.source }))
  const favourites = (await getAll<StoredFavourite>('favourites')).filter((f) => !f.deleted).map((f) => f.id)
  return {
    app: 'Unity',
    exportedAt: new Date().toISOString(),
    note: 'Photos stay on your device and are not included in this export.',
    profile: { nickname: settings.nickname },
    settings: { theme: settings.theme, textScale: settings.textScale, reminder: settings.reminder },
    entries,
    health,
    favouriteAffirmations: favourites,
  }
}

export async function downloadExport(): Promise<void> {
  const data = JSON.stringify(await buildExport(), null, 2)
  const filename = `unity-export-${new Date().toISOString().slice(0, 10)}.json`
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const res = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: 'My Unity data', url: res.uri })
    return
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** Wipes all on-device data, keys and reminders. */
export async function wipeLocalData(): Promise<void> {
  await cancelDailyReminder().catch(() => undefined)
  await deleteDataKey().catch(() => undefined)
  await wipeAll()
  try {
    localStorage.clear()
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  if ('caches' in globalThis) {
    for (const k of await caches.keys()) await caches.delete(k)
  }
}
