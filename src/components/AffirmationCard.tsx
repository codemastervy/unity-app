import { Heart, Share2 } from 'lucide-react'
import { useState } from 'react'
import type { Affirmation } from '../data/affirmations'
import { shareAffirmation } from '../lib/shareImage'
import { useApp } from '../state/AppContext'

export function AffirmationCard({ a }: { a: Affirmation }) {
  const { favourites, toggleFavourite } = useApp()
  const fav = favourites.has(a.id)
  const [status, setStatus] = useState('')
  return (
    <li className="flex items-start gap-1 rounded-[24px] bg-surface p-5 pr-3 shadow-soft dark:border dark:border-line">
      <p className="flex-1 pt-2 font-display text-lg leading-snug font-semibold text-ink">{a.text}</p>
      <button onClick={() => void toggleFavourite(a.id)} aria-pressed={fav} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} className="grid min-h-11 min-w-11 place-items-center rounded-full">
        <Heart aria-hidden className={fav ? 'fill-brand text-brand' : 'text-ink-2'} />
      </button>
      <button
        onClick={async () => {
          const r = await shareAffirmation(a.text)
          setStatus(r === 'downloaded' ? 'Image saved' : '')
        }}
        aria-label="Share as image"
        className="grid min-h-11 min-w-11 place-items-center rounded-full text-ink-2"
      >
        <Share2 aria-hidden />
      </button>
      <span role="status" className="sr-only">
        {status}
      </span>
    </li>
  )
}
