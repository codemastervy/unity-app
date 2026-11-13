import { LifeBuoy, MessageSquare, Phone } from 'lucide-react'
import { HELP_NOW_IDS, smsHref, telHref } from '../data/resources'
import { useApp } from '../state/AppContext'
import { Sheet } from './ui'

/** "Need help now?" — reachable from every screen in one tap (CLAUDE.md §5). */
export function HelpButton({ compact = false }: { compact?: boolean }) {
  const { setHelpOpen } = useApp()
  return (
    <button
      onClick={() => setHelpOpen(true)}
      className="flex min-h-11 items-center gap-1.5 rounded-full bg-rose-100 px-3.5 text-sm font-bold text-rose-800 ring-1 ring-rose-200 transition active:scale-95 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900"
      aria-haspopup="dialog"
    >
      <LifeBuoy size={18} aria-hidden />
      {compact ? (
        <span>
          Help<span className="sr-only"> — need help now?</span>
        </span>
      ) : (
        <span>Need help now?</span>
      )}
    </button>
  )
}

export function HelpSheet() {
  const { helpOpen, setHelpOpen, resources } = useApp()
  const list = HELP_NOW_IDS.map((id) => resources.find((r) => r.id === id)).filter((r) => !!r)
  return (
    <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Need help now?">
      <p className="mb-4 text-ink-2">You’re not alone. These services are free and available 24/7.</p>
      <a href="tel:111" className="mb-4 flex min-h-14 items-center gap-3 rounded-3xl bg-red-700 px-5 py-4 text-white">
        <Phone aria-hidden />
        <span>
          <span className="block text-lg font-bold">Call 111</span>
          <span className="text-sm">If you or someone else is in danger right now</span>
        </span>
      </a>
      <ul className="space-y-3">
        {list.map((r) => (
          <li key={r.id} className="rounded-3xl bg-surface-2 p-4">
            <p className="font-bold text-ink">{r.name}</p>
            <p className="mb-3 text-sm text-ink-2">{r.description}</p>
            <div className="flex flex-wrap gap-2">
              {r.phone && (
                <a href={telHref(r.phone)} className="flex min-h-11 items-center gap-2 rounded-full bg-sunrise px-4 font-bold text-[#2b1d14]">
                  <Phone size={18} aria-hidden /> Call {r.phoneLabel ?? r.phone}
                </a>
              )}
              {r.sms && (
                <a href={smsHref(r.sms)} className="flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 font-semibold text-ink">
                  <MessageSquare size={18} aria-hidden /> Text {r.sms}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-2">Unity is not a crisis service. If you can, tell an adult you trust how you’re feeling.</p>
    </Sheet>
  )
}
