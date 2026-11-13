import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Button, Card, Field, inputClass, Notice, SectionTitle, Sheet, Toggle } from '../components/ui'
import { deleteRemoteAccount, friendlyAuthError, reauthenticate, setSessionOnly, signOut } from '../lib/account'
import { biometryAvailable, makePin, PIN_RE } from '../lib/applock'
import { downloadExport, wipeLocalData } from '../lib/dataExport'
import { pad } from '../lib/dates'
import { cancelDailyReminder, remindersSupported, scheduleDailyReminder } from '../lib/notifications'
import type { TextScale, Theme } from '../lib/settings'
import { useApp } from '../state/AppContext'

export function SettingsPage() {
  const { settings, updateSettings, user } = useApp()
  const [pinOpen, setPinOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [bio, setBio] = useState(false)
  const [reminderMsg, setReminderMsg] = useState('')
  const [nick, setNick] = useState(settings.nickname)

  useEffect(() => {
    biometryAvailable().then(setBio)
  }, [])

  async function setReminder(enabled: boolean, hour = settings.reminder.hour, minute = settings.reminder.minute) {
    setReminderMsg('')
    if (enabled) {
      const ok = await scheduleDailyReminder(hour, minute)
      if (!ok) {
        setReminderMsg('Notifications are turned off for Unity in your phone settings.')
        enabled = false
      }
    } else await cancelDailyReminder()
    await updateSettings({ reminder: { enabled, hour, minute } })
  }

  return (
    <Page title="Settings" back>
      <SectionTitle>You</SectionTitle>
      <Card>
        <Field label="Nickname" hint="Optional — no real names needed" htmlFor="nick">
          <input id="nick" value={nick} maxLength={30} onChange={(e) => setNick(e.target.value)} onBlur={() => void updateSettings({ nickname: nick.trim() })} className={inputClass} autoComplete="nickname" />
        </Field>
      </Card>

      <SectionTitle>Look & feel</SectionTitle>
      <Card>
        <Field label="Theme" htmlFor="theme">
          <select id="theme" value={settings.theme} onChange={(e) => void updateSettings({ theme: e.target.value as Theme })} className={inputClass}>
            <option value="system">Match my phone</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <Field label="Text size" htmlFor="tsize">
          <select id="tsize" value={settings.textScale} onChange={(e) => void updateSettings({ textScale: Number(e.target.value) as TextScale })} className={inputClass}>
            <option value={1}>Default</option>
            <option value={1.125}>Large</option>
            <option value={1.25}>Larger</option>
            <option value={1.4}>Largest</option>
          </select>
        </Field>
      </Card>

      <SectionTitle>Daily check-in reminder</SectionTitle>
      <Card>
        {remindersSupported() ? (
          <>
            <Toggle label="Remind me to check in" checked={settings.reminder.enabled} onChange={(v) => void setReminder(v)} />
            {settings.reminder.enabled && (
              <Field label="Time" htmlFor="rtime">
                <input
                  id="rtime"
                  type="time"
                  value={`${pad(settings.reminder.hour)}:${pad(settings.reminder.minute)}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(':').map(Number)
                    if (!Number.isNaN(h)) void setReminder(true, h, m)
                  }}
                  className={inputClass}
                />
              </Field>
            )}
            {reminderMsg && <Notice tone="error">{reminderMsg}</Notice>}
          </>
        ) : (
          <p className="text-ink-2">Reminders work in the Unity iPhone and Android apps.</p>
        )}
      </Card>

      <SectionTitle>Privacy & security</SectionTitle>
      <Card>
        <Toggle
          label="App lock"
          description="Ask for a PIN when you open Unity"
          checked={settings.lock.enabled}
          onChange={(v) => (v ? setPinOpen(true) : void updateSettings({ lock: { ...settings.lock, enabled: false, pinHash: '', pinSalt: '', biometric: false } }))}
        />
        {settings.lock.enabled && (
          <>
            {bio && <Toggle label="Use Face ID / fingerprint" checked={settings.lock.biometric} onChange={(v) => void updateSettings({ lock: { ...settings.lock, biometric: v } })} />}
            <Field label="Lock again after" htmlFor="lockto">
              <select id="lockto" value={settings.lock.timeoutMins} onChange={(e) => void updateSettings({ lock: { ...settings.lock, timeoutMins: Number(e.target.value) } })} className={inputClass}>
                <option value={0}>Straight away</option>
                <option value={1}>1 minute</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
              </select>
            </Field>
          </>
        )}
        {user && (
          <Toggle
            label="Sign out when I close Unity"
            description="Good for shared devices"
            checked={settings.signOutOnClose}
            onChange={async (v) => {
              await setSessionOnly(v).catch(() => undefined)
              await updateSettings({ signOutOnClose: v })
            }}
          />
        )}
        <Link to="/privacy" className="mt-2 block min-h-11 py-2 font-semibold text-accent">
          Read the privacy policy
        </Link>
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card>
        <Button variant="secondary" className="w-full" onClick={() => void downloadExport()}>
          Export my data (JSON)
        </Button>
        <Button variant="danger" className="mt-3 w-full" onClick={() => setDeleteOpen(true)}>
          {user ? 'Delete my account and all data' : 'Delete all my data'}
        </Button>
      </Card>

      <PinSheet open={pinOpen} onClose={() => setPinOpen(false)} />
      <DeleteSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </Page>
  )
}

function PinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp()
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [err, setErr] = useState('')
  return (
    <Sheet open={open} onClose={onClose} title="Set a PIN">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!PIN_RE.test(pin)) return setErr('Use 4–6 numbers.')
          if (pin !== pin2) return setErr('Those PINs don’t match.')
          const { hash, salt } = await makePin(pin)
          await updateSettings({ lock: { ...settings.lock, enabled: true, pinHash: hash, pinSalt: salt } })
          setPin('')
          setPin2('')
          onClose()
        }}
      >
        <Field label="New PIN" htmlFor="pin1">
          <input id="pin1" inputMode="numeric" type="password" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </Field>
        <Field label="Type it again" htmlFor="pin2">
          <input id="pin2" inputMode="numeric" type="password" autoComplete="new-password" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </Field>
        <p className="mb-3 text-sm text-ink-2">If you forget your PIN, the only way back in is to erase Unity’s data on this device (you can restore it if you use an account).</p>
        {err && <Notice tone="error">{err}</Notice>}
        <Button type="submit" className="mt-3 w-full">
          Turn on app lock
        </Button>
      </form>
    </Sheet>
  )
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useApp()
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setErr('')
    try {
      if (user) {
        await reauthenticate(user, password)
        await deleteRemoteAccount(user.uid)
        await signOut().catch(() => undefined)
      }
      await wipeLocalData()
      window.location.replace(import.meta.env.BASE_URL)
    } catch (e) {
      setErr(e instanceof Error && !('code' in e) ? e.message : friendlyAuthError(e))
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Delete everything?">
      <p className="mb-3 text-ink">
        This permanently deletes your journal, moods, health logs and favourites {user ? 'from this device and from your account, and deletes your account' : 'from this device'}. It can’t be undone.
      </p>
      <p className="mb-4 text-sm text-ink-2">Want a copy first? Use “Export my data”.</p>
      {user?.provider === 'password' && (
        <Field label="Your account password" htmlFor="delpw">
          <input id="delpw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </Field>
      )}
      <Field label='Type "delete" to confirm' htmlFor="delconf">
        <input id="delconf" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={inputClass} autoComplete="off" />
      </Field>
      {err && <Notice tone="error">{err}</Notice>}
      <Button variant="danger" className="mt-3 w-full" disabled={busy || confirmText.trim().toLowerCase() !== 'delete'} onClick={() => void run()}>
        {busy ? 'Deleting…' : 'Delete everything'}
      </Button>
    </Sheet>
  )
}
