import type { ReactNode } from 'react'
import { Page } from '../components/Layout'
import { LogoMark } from '../components/Logo'

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-7 mb-2 text-xl font-bold text-ink">{children}</h2>
}
function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-ink">{children}</p>
}

export const PRIVACY_UPDATED = '13 November 2026'

/** Plain-language privacy policy for teens and parents (NZ Privacy Act 2020). DRAFT — review before launch. */
export function Privacy() {
  return (
    <Page title="Privacy" back>
      <p className="text-sm text-ink-2">Last updated {PRIVACY_UPDATED}</p>
      <H>The short version</H>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-ink">
        <li>Your journal is yours. It’s encrypted on your device and we can’t read it.</li>
        <li>No ads, no tracking, no selling data. Ever.</li>
        <li>Schools never see your entries, moods or health info.</li>
        <li>You can download or delete all your data whenever you want.</li>
      </ul>

      <H>What we collect</H>
      <P>
        <strong>Without an account:</strong> nothing leaves your device. Your journal, moods, star ratings, photos, health logs and favourites are stored only on your phone or computer, and your journal words and photos are encrypted.
      </P>
      <P>
        <strong>With an optional account:</strong> your email address (to sign in), a nickname if you choose one, and a backup of your entries and health logs. Your one-word entries and journal text are encrypted on your device <em>before</em> upload using a passphrase only you know. Photos are never uploaded.
      </P>
      <P>We don’t collect your real name, location, contacts, school ID or anything from your camera or microphone.</P>

      <H>Health data</H>
      <P>
        If you log sleep, water, exercise, steps or energy, it’s used only to show your summary. It’s never shared with your school, advertisers or anyone else.
      </P>

      <H>Where it’s stored</H>
      <P>Account backups are stored with Google Firebase in Sydney, Australia. Firebase is used only to store your backup and sign you in.</P>

      <H>Suggestions</H>
      <P>If you suggest an affirmation, it’s checked by an admin before anyone sees it. Don’t include names or personal details.</P>

      <H>Your rights</H>
      <P>
        Under the NZ Privacy Act 2020 you can ask to see or correct your information. In Unity you can do this yourself: <strong>Settings → Export my data</strong> gives you a copy of everything, and <strong>Delete my account and all data</strong> removes it from your device and our servers.
      </P>

      <H>If something goes wrong</H>
      <P>If there’s ever a privacy breach that could cause serious harm, we’ll tell affected users and the Office of the Privacy Commissioner as quickly as possible.</P>

      <H>Contact</H>
      <P>Questions or concerns? Contact the Unity team through your school, or the Office of the Privacy Commissioner at privacy.org.nz.</P>
    </Page>
  )
}

export function About() {
  return (
    <Page title="About Unity" back>
      <div className="mt-2 flex items-center gap-4">
        <LogoMark size={64} />
        <div>
          <p className="font-display text-3xl font-extrabold text-ink">unity</p>
          <p className="text-ink-2">Made for teenagers by teenagers 🧡</p>
        </div>
      </div>
      <P>
        <br />
        Unity is a free mental health and wellbeing app for young people in Aotearoa New Zealand. It started as the “Mental Health Super App” in the App Launchpad contest run by Rotorua Lakes Council.
      </P>
      <div className="my-4 rounded-2xl bg-cream-t p-4 text-ink">
        <p className="font-semibold">Unity is not a crisis service.</p>
        <p className="mt-1 text-sm">It can’t give medical advice or counselling. If you’re in danger call 111. To talk to a trained counsellor any time, free call or text 1737.</p>
      </div>
      <H>Kia kaha</H>
      <P>Looking after your mind is just as important as looking after your body. Check in, be kind to yourself, and reach out when you need to.</P>
      <p className="mt-6 text-sm text-ink-2">Version {__APP_VERSION__}</p>
    </Page>
  )
}
