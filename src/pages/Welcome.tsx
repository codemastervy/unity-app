import { ChevronRight, Droplets, Flame, Footprints, Heart, Moon, PenLine, Share2, Timer } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Page } from '../components/Layout'
import { LowMoodCard } from '../components/LowMoodCard'
import { MoodCalendar } from '../components/MoodCalendar'
import { dailyAffirmation } from '../lib/affirmations'
import { formatLong, todayISO } from '../lib/dates'
import { currentStreak } from '../lib/insights'
import { getMood, MOODS } from '../lib/moods'
import { shareAffirmation } from '../lib/shareImage'
import { useApp } from '../state/AppContext'

export function Welcome() {
  const { affirmations, entries, health, settings, favourites, toggleFavourite } = useApp()
  const navigate = useNavigate()
  const today = todayISO()
  const aff = dailyAffirmation(affirmations, today)
  const fav = favourites.has(aff.id)
  const h = health.find((x) => x.date === today)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Mōrena' : hour < 18 ? 'Kia ora' : 'Pō mārie'
  const todays = entries.find((e) => e.date === today)
  const todayMood = todays ? getMood(todays.mood) : undefined
  const streak = currentStreak(entries, today)

  return (
    <Page title="Welcome" hideTitle>
      <section className="animate-rise mb-5">
        <p className="text-sm font-semibold text-accent">{formatLong(today)}</p>
        <p className="font-display text-[2.1rem] leading-tight font-extrabold text-ink">
          {greeting}
          {settings.nickname ? `, ${settings.nickname}` : ''} 👋
        </p>
      </section>

      {/* Today's affirmation */}
      <section aria-label="Today’s affirmation" className="animate-rise relative overflow-hidden rounded-[32px] shadow-soft">
        <img src={`${import.meta.env.BASE_URL}fern.svg`} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/25" aria-hidden />
        <div className="relative flex min-h-60 flex-col justify-end p-6">
          <span className="mb-auto w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase backdrop-blur">✨ Today’s affirmation</span>
          <p className="mt-8 font-display text-[1.7rem] leading-snug font-bold text-white">{aff.text}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => void toggleFavourite(aff.id)} aria-pressed={fav} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} className="grid h-11 w-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur">
              <Heart size={20} aria-hidden className={fav ? 'fill-white' : ''} />
            </button>
            <button onClick={() => void shareAffirmation(aff.text)} aria-label="Share as image" className="grid h-11 w-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur">
              <Share2 size={20} aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* Quick check-in */}
      <section aria-labelledby="checkin" className="mt-5 rounded-[28px] bg-surface p-5 shadow-soft dark:border dark:border-line">
        {todays && todayMood ? (
          <Link to={`/entries/${todays.id}`} className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: todayMood.color }} aria-hidden>
              {todayMood.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span id="checkin" className="block text-sm text-ink-2">
                You checked in today
              </span>
              <span className="block truncate font-display text-xl font-bold text-ink">“{todays.oneWord}”</span>
            </span>
            <ChevronRight className="text-ink-2" aria-hidden />
          </Link>
        ) : (
          <>
            <h2 id="checkin" className="text-xl font-bold text-ink">
              How are you feeling?
            </h2>
            <p className="mb-4 text-sm text-ink-2">Tap one to start today’s journal.</p>
            <ul className="-mx-1 grid grid-cols-4 gap-2">
              {MOODS.map((m) => (
                <li key={m.id}>
                  <button onClick={() => navigate(`/journal/new?mood=${m.id}`)} className="flex w-full flex-col items-center gap-1 rounded-2xl py-2 transition active:scale-95">
                    <span className="grid h-13 w-13 place-items-center rounded-2xl text-2xl" style={{ background: m.color }} aria-hidden>
                      {m.emoji}
                    </span>
                    <span className="text-xs font-semibold text-ink">{m.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link to="/journal/new" className="flex min-h-16 items-center gap-3 rounded-[24px] bg-sunrise px-4 font-bold text-[#2b1d14] shadow-soft">
          <PenLine size={22} aria-hidden /> Journal
        </Link>
        <Link to="/entries" className="flex min-h-16 items-center gap-3 rounded-[24px] bg-surface px-4 font-bold text-ink shadow-soft dark:border dark:border-line">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cream-t text-accent">
            <Flame size={20} aria-hidden />
          </span>
          <span>
            {streak} day{streak === 1 ? '' : 's'}
            <span className="block text-xs font-medium text-ink-2">streak</span>
          </span>
        </Link>
      </div>

      <LowMoodCard />

      {/* Health */}
      <Link to="/health" className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Today’s health</h2>
        <span className="flex items-center text-sm font-semibold text-accent">
          Log <ChevronRight size={18} aria-hidden />
        </span>
      </Link>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile tint="#E7E0FF" icon={<Moon size={18} aria-hidden />} label="Sleep" value={h?.sleepHrs != null ? `${h.sleepHrs} h` : '–'} />
        <Tile tint="#DCEEFF" icon={<Droplets size={18} aria-hidden />} label="Water" value={h?.waterGlasses != null ? `${h.waterGlasses} glasses` : '–'} />
        <Tile tint="#DDF5E5" icon={<Footprints size={18} aria-hidden />} label="Steps" value={h?.steps != null ? h.steps.toLocaleString('en-NZ') : '–'} />
        <Tile tint="#FFE6D0" icon={<Timer size={18} aria-hidden />} label="Exercise" value={h?.exerciseMins != null ? `${h.exerciseMins} min` : '–'} />
      </dl>

      <div className="mt-8 rounded-[28px] bg-surface p-4 shadow-soft dark:border dark:border-line">
        <MoodCalendar entries={entries} />
      </div>
    </Page>
  )
}

function Tile({ icon, label, value, tint }: { icon: ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="flex flex-col-reverse rounded-[22px] p-4 dark:!bg-[var(--surface)]" style={{ background: tint }}>
      <dd className="mt-1 font-display text-xl font-bold text-[#2b1d14] dark:text-ink">{value}</dd>
      <dt className="flex items-center gap-1.5 text-sm font-semibold text-[#5b4a3e] dark:text-ink-2">
        {icon}
        {label}
      </dt>
    </div>
  )
}
