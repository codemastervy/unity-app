import { useMemo, useState } from 'react'
import { AffirmationCard } from '../components/AffirmationCard'
import { Page } from '../components/Layout'
import { CATEGORIES } from '../data/affirmations'
import { useApp } from '../state/AppContext'

type Filter = 'all' | 'favourites' | (typeof CATEGORIES)[number]['id']

export function AllAffirmations() {
  const { affirmations, favourites } = useApp()
  const [filter, setFilter] = useState<Filter>('all')
  const chips: { id: Filter; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'favourites', label: '♥ Saved' }, ...CATEGORIES]
  const list = useMemo(
    () =>
      affirmations.filter((a) => a.active && (filter === 'all' || (filter === 'favourites' ? favourites.has(a.id) : a.category === filter))),
    [affirmations, favourites, filter],
  )

  return (
    <Page title="All Affirmations" subtitle="Save the ones that feel true for you.">
      <div role="group" aria-label="Filter by category" className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-1 pb-3">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            aria-pressed={filter === c.id}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm whitespace-nowrap transition ${filter === c.id ? 'bg-sunrise font-bold text-[#2b1d14] shadow-soft' : 'bg-surface font-medium text-ink shadow-soft'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="mt-8 text-center text-ink-2">{filter === 'favourites' ? 'Tap the heart on any affirmation to save it here.' : 'Nothing here yet.'}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {list.map((a) => (
            <AffirmationCard key={a.id} a={a} />
          ))}
        </ul>
      )}
    </Page>
  )
}
