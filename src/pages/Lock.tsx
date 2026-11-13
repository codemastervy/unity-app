import { Fingerprint } from 'lucide-react'
import { LogoMark } from '../components/Logo'
import { useEffect, useState, type FormEvent } from 'react'
import { HelpButton } from '../components/HelpSheet'
import { Button, inputClass, Notice, Sheet } from '../components/ui'
import { biometricUnlock, checkPin, lockoutRemainingMs, recordAttempt } from '../lib/applock'
import { wipeLocalData } from '../lib/dataExport'
import { useApp } from '../state/AppContext'

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { settings } = useApp()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [wait, setWait] = useState(0)
  const [forgot, setForgot] = useState(false)

  useEffect(() => {
    if (settings.lock.biometric) biometricUnlock().then((ok) => ok && onUnlock())
  }, [settings.lock.biometric, onUnlock])

  useEffect(() => {
    lockoutRemainingMs().then(setWait)
  }, [])
  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => Math.max(0, w - 1000)), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (wait > 0) return
    const ok = await checkPin(pin, settings.lock.pinHash, settings.lock.pinSalt)
    await recordAttempt(ok)
    if (ok) return onUnlock()
    setPin('')
    setErr('That PIN isn’t right.')
    setWait(await lockoutRemainingMs())
  }

  return (
    <div className="pt-safe flex min-h-dvh flex-col">
      <div className="flex justify-end p-3">
        <HelpButton />
      </div>
      <main className="mx-auto flex w-full max-w-xs flex-1 flex-col items-center justify-center px-6 pb-20">
        <LogoMark size={72} />
        <h1 className="mt-5 text-3xl font-extrabold text-ink">Unity is locked</h1>
        <form onSubmit={submit} className="mt-6 w-full">
          <label htmlFor="unlock-pin" className="sr-only">
            PIN
          </label>
          <input
            id="unlock-pin"
            autoFocus
            inputMode="numeric"
            type="password"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
            placeholder="PIN"
          />
          {err && (
            <div className="mt-3">
              <Notice tone="error">{wait > 0 ? `Too many tries. Wait ${Math.ceil(wait / 1000)}s.` : err}</Notice>
            </div>
          )}
          <Button type="submit" disabled={pin.length < 4 || wait > 0} className="mt-4 w-full">
            Unlock
          </Button>
        </form>
        {settings.lock.biometric && (
          <Button variant="ghost" className="mt-2 flex items-center gap-2" onClick={() => biometricUnlock().then((ok) => ok && onUnlock())}>
            <Fingerprint size={20} aria-hidden /> Use Face ID / fingerprint
          </Button>
        )}
        <Button variant="ghost" className="mt-4 text-sm" onClick={() => setForgot(true)}>
          Forgot PIN?
        </Button>
      </main>
      <Sheet open={forgot} onClose={() => setForgot(false)} title="Forgot your PIN?">
        <p className="text-ink">To keep your journal private, the only way to reset the PIN is to erase Unity’s data on this device.</p>
        <p className="mt-2 text-sm text-ink-2">If you use an account, you can sign back in afterwards and restore your synced entries with your journal passphrase.</p>
        <Button
          variant="danger"
          className="mt-4 w-full"
          onClick={async () => {
            await wipeLocalData()
            window.location.replace(import.meta.env.BASE_URL)
          }}
        >
          Erase this device’s Unity data
        </Button>
      </Sheet>
    </div>
  )
}
