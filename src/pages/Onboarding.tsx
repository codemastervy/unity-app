import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HelpButton } from '../components/HelpSheet'
import { LogoMark } from '../components/Logo'
import { Button, Field, inputClass } from '../components/ui'
import { CONSENT_VERSION } from '../lib/settings'
import { useApp } from '../state/AppContext'

/** First launch: what Unity is (and isn't), privacy summary, consent, optional nickname. */
export function Onboarding() {
  const { updateSettings } = useApp()
  const [step, setStep] = useState(0)
  const [agree, setAgree] = useState(false)
  const [nick, setNick] = useState('')

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col">
      <div className="flex justify-end p-3">
        <HelpButton />
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8">
        {step === 0 && (
          <>
            <div className="animate-rise mx-auto mt-2 rounded-[30px] shadow-soft">
              <LogoMark size={96} />
            </div>
            <h1 className="animate-rise mt-6 text-center text-[2.2rem] leading-tight font-extrabold text-ink">Kia ora, welcome to Unity</h1>
            <p className="mt-3 text-center text-lg text-ink-2">A free space to check in with yourself. Made for teenagers by teenagers 🧡</p>
            <ul className="mt-7 grid grid-cols-2 gap-3 text-sm font-semibold text-[#2b1d14]">
              <li className="rounded-[22px] bg-[#FFE6D0] p-4"><span className="mb-1 block text-2xl" aria-hidden>📝</span>Journal & track your mood</li>
              <li className="rounded-[22px] bg-[#E7E0FF] p-4"><span className="mb-1 block text-2xl" aria-hidden>💬</span>Daily affirmations</li>
              <li className="rounded-[22px] bg-[#DDF5E5] p-4"><span className="mb-1 block text-2xl" aria-hidden>🌿</span>Sleep, water & exercise</li>
              <li className="rounded-[22px] bg-[#DCEEFF] p-4"><span className="mb-1 block text-2xl" aria-hidden>📞</span>Free NZ helplines</li>
            </ul>
            <div className="mt-5 rounded-[22px] border-2 border-[var(--peach)] bg-cream-t p-4 text-ink">
              <p className="font-semibold">Unity is not a crisis service.</p>
              <p className="mt-1 text-sm">If you’re in danger, call 111. To talk to someone any time, call or text 1737 — it’s free. Tap “Need help now?” on any screen.</p>
            </div>
            <div className="flex-1" />
            <Button className="mt-8 w-full" onClick={() => setStep(1)}>
              Next
            </Button>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="mt-4 text-[2rem] leading-tight font-extrabold text-ink">Your privacy, in plain words 🔒</h1>
            <ul className="mt-5 space-y-2 rounded-[24px] bg-surface p-5 pl-9 text-ink shadow-soft list-disc dark:border dark:border-line">
              <li>Everything you write stays on this device, locked with encryption.</li>
              <li>You don’t need an account. If you make one to back up, your journal is encrypted before it leaves your phone — we can’t read it.</li>
              <li>We never sell your data, show ads, or use tracking.</li>
              <li>Your school can’t see your entries, moods or health logs.</li>
              <li>You can export or delete everything at any time in Settings.</li>
            </ul>
            <Link to="/privacy" className="mt-4 font-semibold text-accent underline">
              Read the full privacy policy
            </Link>
            <p className="mt-4 text-sm text-ink-2">If you’re under 16, it’s a good idea to show this to a parent or caregiver.</p>
            <label className="mt-6 flex items-start gap-3 text-ink">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-6 w-6 accent-[var(--accent-ink)]" />
              <span>I understand how Unity looks after my information and that it isn’t a crisis service.</span>
            </label>
            <div className="flex-1" />
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button disabled={!agree} onClick={() => setStep(2)}>
                I agree
              </Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="mt-4 text-[2rem] leading-tight font-extrabold text-ink">What should we call you?</h1>
            <p className="mt-2 text-ink-2">A nickname is fine — or skip it. No real names needed.</p>
            <div className="mt-6">
              <Field label="Nickname (optional)" htmlFor="onb-nick">
                <input id="onb-nick" value={nick} maxLength={30} onChange={(e) => setNick(e.target.value)} className={inputClass} autoComplete="nickname" />
              </Field>
            </div>
            <div className="flex-1" />
            <Button className="mt-8 w-full" onClick={() => void updateSettings({ nickname: nick.trim(), consentVersion: CONSENT_VERSION, consentAt: Date.now() })}>
              Let’s go
            </Button>
          </>
        )}
      </main>
    </div>
  )
}
