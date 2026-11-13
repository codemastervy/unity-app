import { MessageSquare, Phone } from 'lucide-react'
import { todayISO } from '../lib/dates'
import { hasLowMoodStreak } from '../lib/insights'
import { useApp } from '../state/AppContext'

/**
 * Gentle, non-alarming check-in after several low days in a row (CLAUDE.md §5).
 * Never blocks the user and never contacts anyone.
 */
export function LowMoodCard() {
  const { entries, settings, updateSettings } = useApp()
  const today = todayISO()
  if (settings.lowMoodDismissedOn === today || !hasLowMoodStreak(entries, today)) return null
  return (
    <section aria-label="A gentle check-in" className="mt-5 rounded-[28px] border-2 border-[var(--peach)] bg-cream-t p-5">
      <p className="font-display text-lg font-bold text-ink">It looks like things have been tough lately 💛</p>
      <p className="mt-1 text-sm text-ink">
        That’s okay. Talking to someone can really help — it’s free, private and you don’t need to be in crisis to reach out.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href="tel:1737" className="flex min-h-11 items-center gap-2 rounded-full bg-sunrise px-4 font-bold text-[#2b1d14]">
          <Phone size={18} aria-hidden /> Call or text 1737
        </a>
        <a href="sms:234" className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 font-semibold text-ink">
          <MessageSquare size={18} aria-hidden /> Text Youthline 234
        </a>
      </div>
      <button onClick={() => void updateSettings({ lowMoodDismissedOn: today })} className="mt-3 min-h-11 text-sm font-semibold text-accent">
        Not right now
      </button>
    </section>
  )
}
