import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Page } from '../components/Layout'
import { Button, Card, Field, inputClass, Notice, SectionTitle } from '../components/ui'
import {
  changePassphrase,
  friendlyAuthError,
  googleSignInSupported,
  PASSPHRASE_MIN,
  pushProfile,
  refreshVerification,
  resendVerification,
  resetPassword,
  setupPassphrase,
  signInEmail,
  signInGoogle,
  signOut,
  signUpEmail,
  unlockWithPassphrase,
} from '../lib/account'
import { isDemoBackend } from '../lib/backend'
import { useApp } from '../state/AppContext'

const errMsg = (e: unknown) => (e instanceof Error && e.message && !('code' in e) ? e.message : friendlyAuthError(e))

export function AccountPage() {
  const { accountStatus } = useApp()
  return (
    <Page title="Account & sync" back>
      <Notice>
        An account is <strong>optional</strong>. Unity works fully without one — it just lets you back up and sync between devices. No real name needed.
      </Notice>
      {isDemoBackend && <DemoNotice />}
      {accountStatus === 'signed-out' ? (
        <SignIn />
      ) : accountStatus === 'unverified' ? (
        <Verify />
      ) : accountStatus === 'needs-setup' ? (
        <Passphrase mode="setup" />
      ) : accountStatus === 'needs-unlock' ? (
        <Passphrase mode="unlock" />
      ) : (
        <Ready />
      )}
    </Page>
  )
}

export function DemoNotice() {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-accent/50 bg-surface p-4 text-sm text-ink" role="note">
      <p className="font-semibold">Demo mode — accounts are simulated</p>
      <p className="mt-1 text-ink-2">
        This preview has no real server. Sign-up, email verification and “cloud” sync are simulated inside this browser, and nothing is sent anywhere. Use a made-up email if you like. Press “I’ve verified” to skip the email step.
      </p>
    </div>
  )
}

function SignIn() {
  const { refreshAccount } = useApp()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      if (mode === 'up') await signUpEmail(email, password)
      else await signInEmail(email, password)
      await refreshAccount()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div role="tablist" aria-label="Account" className="mt-6 grid grid-cols-2 rounded-full bg-surface-2 p-1">
        {(['in', 'up'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`min-h-11 rounded-full ${mode === m ? 'bg-surface font-semibold text-ink shadow' : 'text-ink-2'}`}>
            {m === 'in' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-5">
        <Field label="Email" htmlFor="em">
          <input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Password" hint={mode === 'up' ? 'At least 8 characters' : undefined} htmlFor="pw">
          <input id="pw" type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} minLength={mode === 'up' ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
        </Field>
        {err && <Notice tone="error">{err}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}
        <Button type="submit" disabled={busy} className="mt-3 w-full">
          {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}
        </Button>
        {mode === 'in' && (
          <Button
            type="button"
            variant="ghost"
            className="mt-1 w-full"
            onClick={async () => {
              setErr('')
              if (!email) return setErr('Type your email first.')
              await resetPassword(email).catch(() => undefined)
              setInfo('If there’s an account for that email, a reset link is on its way.')
            }}
          >
            Forgot password?
          </Button>
        )}
      </form>
      {googleSignInSupported() && (
        <>
          <p className="my-4 text-center text-sm text-ink-2">or</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              setErr('')
              try {
                await signInGoogle()
                await refreshAccount()
              } catch (e) {
                setErr(errMsg(e))
              }
            }}
          >
            Continue with Google
          </Button>
        </>
      )}
      <p className="mt-6 text-sm text-ink-2">If you’re under 16, it’s a good idea to check with a parent or caregiver before making an account.</p>
    </>
  )
}

function Verify() {
  const { user, refreshAccount } = useApp()
  const [msg, setMsg] = useState('')
  return (
    <Card className="mt-6">
      <p className="font-semibold text-ink">Check your email 📬</p>
      <p className="mt-1 text-ink-2">
        {isDemoBackend ? <>In the real app we’d email a link to {user?.email}. This is the demo, so just press the button below.</> : <>We sent a link to {user?.email}. Tap it, then come back here.</>}
      </p>
      <Button
        className="mt-4 w-full"
        onClick={async () => {
          const ok = await refreshVerification().catch(() => false)
          if (ok) await refreshAccount()
          else setMsg('Not verified yet — check your spam folder too.')
        }}
      >
        I’ve verified my email
      </Button>
      <Button variant="ghost" className="mt-1 w-full" onClick={() => resendVerification().then(() => setMsg('Sent another link.')).catch(() => setMsg('Please wait a bit before resending.'))}>
        Resend the link
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => void signOut().then(refreshAccount)}>
        Use a different account
      </Button>
      {msg && <p className="mt-2 text-sm text-ink-2" role="status">{msg}</p>}
    </Card>
  )
}

function Passphrase({ mode }: { mode: 'setup' | 'unlock' }) {
  const { user, settings, refreshAccount, refreshData } = useApp()
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setErr('')
    if (mode === 'setup' && p1 !== p2) return setErr('Those don’t match.')
    setBusy(true)
    try {
      if (mode === 'setup') await setupPassphrase(user.uid, p1, settings)
      else await unlockWithPassphrase(user.uid, p1)
      await refreshData()
      await refreshAccount()
    } catch (e) {
      setErr(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <SectionTitle>{mode === 'setup' ? 'Create a journal passphrase' : 'Unlock your journal'}</SectionTitle>
      <p className="mb-4 text-ink-2">
        {mode === 'setup'
          ? 'Your journal is locked with a passphrase that only you know — not even the Unity team can read it. You’ll need it when you sign in on a new device.'
          : 'Enter the journal passphrase you made when you set up your account.'}
      </p>
      <Field label="Passphrase" hint={mode === 'setup' ? `At least ${PASSPHRASE_MIN} characters` : undefined} htmlFor="pp1">
        <input id="pp1" type="password" autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} value={p1} onChange={(e) => setP1(e.target.value)} className={inputClass} />
      </Field>
      {mode === 'setup' && (
        <Field label="Type it again" htmlFor="pp2">
          <input id="pp2" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} className={inputClass} />
        </Field>
      )}
      {mode === 'setup' && <Notice>⚠️ If you forget it, we can’t recover your synced journal. Write it down somewhere safe.</Notice>}
      {err && (
        <div className="mt-3">
          <Notice tone="error">{err}</Notice>
        </div>
      )}
      <Button type="submit" disabled={busy || p1.length < (mode === 'setup' ? PASSPHRASE_MIN : 1)} className="mt-4 w-full">
        {busy ? 'Working…' : mode === 'setup' ? 'Turn on sync' : 'Unlock'}
      </Button>
      <Button type="button" variant="ghost" className="mt-1 w-full" onClick={() => void signOut().then(refreshAccount)}>
        Sign out
      </Button>
    </form>
  )
}

function Ready() {
  const { user, settings, syncState, lastSyncAt, requestSync, refreshAccount } = useApp()
  const [changing, setChanging] = useState(false)
  const [np, setNp] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <>
      <Card className="mt-6">
        <p className="text-sm text-ink-2">Signed in as</p>
        <p className="font-semibold break-all text-ink">{user?.email}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-ink" role="status">
          {syncState === 'syncing' ? (
            <>
              <RefreshCw size={16} className="animate-spin" aria-hidden /> Syncing…
            </>
          ) : syncState === 'error' || syncState === 'offline' ? (
            <>
              <CloudOff size={16} aria-hidden /> {syncState === 'offline' ? 'Offline — will sync later' : 'Couldn’t sync. We’ll try again.'}
            </>
          ) : (
            <>
              <CheckCircle2 size={16} className="text-green-700 dark:text-green-400" aria-hidden /> {lastSyncAt ? `Synced ${new Date(lastSyncAt).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}` : 'Sync on'}
            </>
          )}
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => { requestSync(); if (user) void pushProfile(user.uid, settings).catch(() => undefined) }}>
          Sync now
        </Button>
      </Card>
      <p className="mt-3 text-sm text-ink-2">Your journal words are encrypted on this device before they’re uploaded. Photos never leave this device.</p>

      <SectionTitle>Journal passphrase</SectionTitle>
      {changing ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!user) return
            try {
              await changePassphrase(user.uid, np)
              setMsg('Passphrase changed.')
              setChanging(false)
              setNp('')
            } catch (e) {
              setMsg(errMsg(e))
            }
          }}
        >
          <Field label="New passphrase" hint={`At least ${PASSPHRASE_MIN} characters`} htmlFor="np">
            <input id="np" type="password" autoComplete="new-password" value={np} onChange={(e) => setNp(e.target.value)} className={inputClass} />
          </Field>
          <Button type="submit" className="w-full" disabled={np.length < PASSPHRASE_MIN}>
            Save new passphrase
          </Button>
        </form>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setChanging(true)}>
          Change passphrase
        </Button>
      )}
      {msg && <p className="mt-2 text-sm text-ink-2" role="status">{msg}</p>}

      <Button variant="ghost" className="mt-6 w-full" onClick={() => void signOut().then(refreshAccount)}>
        Sign out
      </Button>
      <p className="text-center text-sm text-ink-2">Signing out keeps your entries on this device.</p>
    </>
  )
}
