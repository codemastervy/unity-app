import { Globe, MessageSquare, MoreHorizontal, Phone, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Page } from '../components/Layout'
import { Sheet } from '../components/ui'
import { SECTIONS, smsHref, telHref, type Resource } from '../data/resources'
import { useApp } from '../state/AppContext'

const SECTION_TINT: Record<string, string> = { counselling: '#FFD9B0', 'young-people': '#D9CCFF', specific: '#C9EBD6', apps: '#CFE6FF' }

const initials = (name: string) =>
  /^\d/.test(name)
    ? name.split(' ')[0].slice(0, 4)
    : name
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export function Resources() {
  const { resources } = useApp()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Resource | null>(null)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? resources.filter((r) => `${r.name} ${r.description} ${r.phone ?? ''} ${r.sms ?? ''}`.toLowerCase().includes(s)) : resources
  }, [q, resources])

  return (
    <Page title="Resources" subtitle="All services are free and available 24/7 unless otherwise specified.">
      <a href="tel:111" className="mb-4 flex min-h-16 items-center gap-4 rounded-[24px] bg-red-700 px-5 py-3 text-white shadow-soft">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20">
          <Phone size={20} aria-hidden />
        </span>
        <span>
          <span className="font-bold">Emergency? Call 111</span>
          <span className="block text-sm">If you or someone else is in danger right now</span>
        </span>
      </a>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" size={20} aria-hidden />
        <label htmlFor="res-search" className="sr-only">
          Search services
        </label>
        <input id="res-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="min-h-13 w-full rounded-2xl bg-surface pr-4 pl-11 text-ink shadow-soft placeholder:text-ink-2 focus:outline-none dark:border dark:border-line" />
      </div>

      {SECTIONS.map((sec) => {
        const items = filtered.filter((r) => r.section === sec.id)
        if (!items.length) return null
        return (
          <section key={sec.id} aria-labelledby={`sec-${sec.id}`}>
            <h2 id={`sec-${sec.id}`} className="mt-8 mb-3 text-xl font-bold text-ink">
              {sec.label}
            </h2>
            <ul className="space-y-2.5">
              {items.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-[22px] bg-surface p-3 shadow-soft dark:border dark:border-line">
                  {r.logo ? (
                    <img src={r.logo} alt="" className="h-12 w-12 rounded-xl object-contain" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-[#2b1d14]" style={{ background: SECTION_TINT[r.section] }} aria-hidden>
                      {initials(r.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{r.name}</p>
                    <p className="text-sm text-ink-2">
                      {[r.phone && `Call ${r.phoneLabel ?? r.phone}`, r.sms && `Text ${r.sms}`].filter(Boolean).join(' · ') || r.description}
                    </p>
                    {r.hours && <p className="text-xs text-ink-2">{r.hours}</p>}
                  </div>
                  <button onClick={() => setOpen(r)} aria-label={`Contact options for ${r.name}`} aria-haspopup="dialog" className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink">
                    <MoreHorizontal aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {filtered.length === 0 && <p className="mt-6 text-center text-ink-2">No services match “{q}”.</p>}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open && (
          <>
            <p className="mb-4 text-ink-2">{open.description}</p>
            <div className="grid gap-2">
              {open.phone && (
                <a href={telHref(open.phone)} className="flex min-h-13 items-center gap-3 rounded-2xl bg-sunrise px-4 font-bold text-[#2b1d14]">
                  <Phone size={20} aria-hidden /> Call {open.phoneLabel ?? open.phone}
                </a>
              )}
              {open.sms && (
                <a href={smsHref(open.sms)} className="flex min-h-13 items-center gap-3 rounded-2xl bg-surface-2 px-4 font-semibold text-ink">
                  <MessageSquare size={20} aria-hidden /> Text {open.sms}
                </a>
              )}
              {open.url && (
                <a href={open.url} target="_blank" rel="noopener noreferrer" className="flex min-h-13 items-center gap-3 rounded-2xl bg-surface-2 px-4 font-semibold text-ink">
                  <Globe size={20} aria-hidden /> Visit website
                </a>
              )}
            </div>
            {open.lastVerified && <p className="mt-4 text-xs text-ink-2">Details last checked {open.lastVerified}.</p>}
          </>
        )}
      </Sheet>
    </Page>
  )
}
