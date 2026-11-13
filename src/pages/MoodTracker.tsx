import { Flame, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart } from '../components/LineChart'
import { Page } from '../components/Layout'
import { Card, SectionTitle, Stars } from '../components/ui'
import { formatLong } from '../lib/dates'
import { currentStreak, insightLines, series } from '../lib/insights'
import { getMood, MOODS } from '../lib/moods'
import { useApp } from '../state/AppContext'

export function MoodTracker() {
  const { entries } = useApp()
  const [range, setRange] = useState<7 | 30>(7)
  const s = useMemo(() => series(entries, range), [entries, range])
  const insights = useMemo(() => insightLines(entries), [entries])
  const streak = currentStreak(entries)
  const counts = useMemo(() => {
    const ids = new Set(s.map((p) => p.date))
    const c = new Map<string, number>()
    for (const e of entries) if (ids.has(e.date)) c.set(e.mood, (c.get(e.mood) ?? 0) + 1)
    return MOODS.map((m) => ({ m, n: c.get(m.id) ?? 0 })).filter((x) => x.n > 0)
  }, [entries, s])
  const total = counts.reduce((a, b) => a + b.n, 0)

  return (
    <Page title="Mood tracker" subtitle="Tap an entry for more">
      <section className="relative overflow-hidden rounded-[28px] bg-sunrise p-5 text-[#2b1d14] shadow-soft">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/40">
            <Flame size={28} aria-hidden />
          </span>
          <div>
            <p className="font-display text-3xl font-extrabold">
              {streak} day{streak === 1 ? '' : 's'}
            </p>
            <p className="text-sm font-semibold">check-in streak</p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 text-[0.95rem] font-medium">
          {insights.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      {entries.length > 0 && (
        <>
          <div className="mt-8 mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Your mood</h2>
            <div role="group" aria-label="Time range" className="flex rounded-full bg-surface-2 p-1">
              {([7, 30] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={`min-h-9 rounded-full px-4 text-sm transition ${range === r ? 'bg-surface font-bold text-ink shadow-soft' : 'font-medium text-ink-2'}`}>
                  {r} days
                </button>
              ))}
            </div>
          </div>
          <Card>
            <LineChart title="Mood" points={s.map((p) => ({ date: p.date, value: p.mood }))} min={1} max={5} yLabels={[[5, '😄'], [3, '😐'], [1, '😢']]} />
            {total > 0 && (
              <div className="mt-4">
                <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`Mood mix: ${counts.map(({ m, n }) => `${m.label} ${n}`).join(', ')}`}>
                  {counts.map(({ m, n }) => (
                    <span key={m.id} style={{ width: `${(n / total) * 100}%`, background: m.color }} />
                  ))}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2" aria-hidden>
                  {counts.map(({ m, n }) => (
                    <li key={m.id}>
                      {m.emoji} {m.label} · {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <SectionTitle>How you rated your days</SectionTitle>
          <Card>
            <LineChart title="Star rating" points={s.map((p) => ({ date: p.date, value: p.stars }))} min={1} max={5} yLabels={[[5, '5★'], [3, '3★'], [1, '1★']]} color="#E8892B" />
          </Card>
        </>
      )}

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Journal entries</h2>
        <Link to="/journal/new" className="flex min-h-11 items-center gap-1 rounded-full bg-sunrise px-4 font-bold text-[#2b1d14] shadow-soft">
          <Plus size={18} aria-hidden /> New
        </Link>
      </div>
      <ul className="space-y-3">
        {entries.map((e) => {
          const m = getMood(e.mood)
          return (
            <li key={e.id}>
              <Link to={`/entries/${e.id}`} className="flex items-center gap-4 rounded-[24px] bg-surface p-3 pr-4 shadow-soft transition active:scale-[0.99] dark:border dark:border-line">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: m?.color }} aria-hidden>
                  {m?.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-bold text-ink">{e.oneWord}</span>
                  <span className="block text-sm text-ink-2">
                    {formatLong(e.date)} · {m?.label}
                  </span>
                </span>
                {e.stars > 0 && <Stars value={e.stars} size={13} />}
              </Link>
            </li>
          )
        })}
      </ul>
    </Page>
  )
}
