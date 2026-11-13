import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../components/Layout'
import { Button, Card, Notice, SectionTitle } from '../components/ui'
import type { StoredHealth } from '../lib/db'
import { formatShort, todayISO } from '../lib/dates'
import { clampHealth, emptyHealth, HEALTH_LIMITS, saveHealth, type HealthField } from '../lib/health'
import { useApp } from '../state/AppContext'

const FIELDS: HealthField[] = ['sleepHrs', 'waterGlasses', 'exerciseMins', 'steps', 'energy']
const BIG_STEP: Partial<Record<HealthField, number>> = { steps: 1000, exerciseMins: 15 }

export function Health() {
  const { health, refreshData, requestSync } = useApp()
  const today = todayISO()
  const [draft, setDraft] = useState<StoredHealth>(() => health.find((h) => h.date === today) ?? emptyHealth(today))
  const [saved, setSaved] = useState(false)

  const change = (f: HealthField, delta: number) => {
    const l = HEALTH_LIMITS[f]
    const cur = draft[f] ?? (f === 'energy' ? 3 - delta : 0)
    setDraft({ ...draft, [f]: clampHealth(f, cur + delta) ?? l.min })
    setSaved(false)
  }

  async function save() {
    await saveHealth(today, Object.fromEntries(FIELDS.map((f) => [f, draft[f]])))
    await refreshData()
    requestSync()
    setSaved(true)
  }

  const history = health.filter((h) => h.date !== today).slice(0, 14)

  return (
    <Page title="Health" subtitle="The basics that help you feel good. Private — never shared with your school or anyone else." back>
      <Card>
        {FIELDS.map((f) => {
          const l = HEALTH_LIMITS[f]
          const step = BIG_STEP[f] ?? l.step
          const v = draft[f]
          return (
            <div key={f} className="flex items-center justify-between border-b border-line py-3 last:border-0">
              <span className="font-semibold text-ink" id={`lbl-${f}`}>
                {l.label}
              </span>
              <div className="flex items-center gap-2" role="group" aria-labelledby={`lbl-${f}`}>
                <button onClick={() => change(f, -step)} aria-label={`Less ${l.label.toLowerCase()}`} className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink transition active:scale-90">
                  <Minus size={18} aria-hidden />
                </button>
                <output aria-live="polite" className="w-24 text-center font-display text-lg font-bold text-ink">
                  {v == null ? '–' : `${f === 'steps' ? v.toLocaleString('en-NZ') : v} ${l.unit}`}
                </output>
                <button onClick={() => change(f, step)} aria-label={`More ${l.label.toLowerCase()}`} className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink transition active:scale-90">
                  <Plus size={18} aria-hidden />
                </button>
              </div>
            </div>
          )
        })}
        <Button onClick={() => void save()} className="mt-3 w-full">
          Save today
        </Button>
        {saved && (
          <div className="mt-3">
            <Notice tone="success">Saved ✨</Notice>
          </div>
        )}
      </Card>

      {history.length > 0 && (
        <>
          <SectionTitle>Past days</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-2">
                <tr>
                  <th scope="col" className="py-2">Date</th>
                  <th scope="col">Sleep</th>
                  <th scope="col">Water</th>
                  <th scope="col">Exercise</th>
                  <th scope="col">Steps</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {history.map((h) => (
                  <tr key={h.date} className="border-t border-line">
                    <th scope="row" className="py-2 font-medium">{formatShort(h.date)}</th>
                    <td>{h.sleepHrs ?? '–'}</td>
                    <td>{h.waterGlasses ?? '–'}</td>
                    <td>{h.exerciseMins ?? '–'}</td>
                    <td>{h.steps?.toLocaleString('en-NZ') ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  )
}
