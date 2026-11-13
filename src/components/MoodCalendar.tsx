import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatLong, formatMonth, monthGrid, parseISODate, todayISO } from '../lib/dates'
import type { Entry } from '../lib/entries'
import { latestByDate } from '../lib/insights'
import { getMood } from '../lib/moods'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Month of mood circles. Empty = no entry; today has an orange ring. Tap a day → that entry. */
export function MoodCalendar({ entries }: { entries: Entry[] }) {
  const today = todayISO()
  const t = parseISODate(today)
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() })
  const navigate = useNavigate()
  const byDate = useMemo(() => latestByDate(entries), [entries])
  const weeks = monthGrid(ym.y, ym.m)
  const shift = (d: number) => setYm(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }))
  const isCurrentMonth = ym.y === t.getFullYear() && ym.m === t.getMonth()

  return (
    <section aria-labelledby="cal-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="cal-title" className="pl-1 text-xl font-bold text-ink">
          {formatMonth(ym.y, ym.m)}
        </h2>
        <div className="flex gap-1">
          <button onClick={() => shift(-1)} aria-label="Previous month" className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Next month" className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink disabled:opacity-30">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-y-1.5">
        <thead>
          <tr>
            {DAYS.map((d, i) => (
              <th key={i} scope="col" abbr={DAY_NAMES[i]} className="pb-1 text-xs font-semibold text-ink-2">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}>
              {w.map((date, j) => {
                if (!date) return <td key={j} />
                const entry = byDate.get(date)
                const mood = entry ? getMood(entry.mood) : undefined
                const isToday = date === today
                const future = date > today
                const label = `${formatLong(date)}: ${mood ? `${mood.label}${entry?.oneWord ? `, “${entry.oneWord}”` : ''}` : future ? 'upcoming' : 'no entry — tap to add'}`
                return (
                  <td key={j} className="text-center">
                    <button
                      disabled={future}
                      aria-label={label}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => navigate(entry ? `/entries/${entry.id}` : `/journal/new?date=${date}`)}
                      className={`mx-auto grid aspect-square w-[min(2.6rem,11vw)] place-items-center rounded-full transition active:scale-90 disabled:opacity-35 ${isToday ? 'ring-[3px] ring-brand ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
                      style={{ background: mood?.color ?? 'var(--empty-day)' }}
                    >
                      {mood ? (
                        <span className="text-lg" aria-hidden>
                          {mood.emoji}
                        </span>
                      ) : (
                        <span className={`text-xs ${isToday ? 'font-extrabold text-accent' : 'font-medium text-ink-2'}`} aria-hidden>
                          {parseISODate(date).getDate()}
                        </span>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
