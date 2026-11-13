import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AffirmationCard } from '../components/AffirmationCard'
import { Page } from '../components/Layout'
import { Button, Card, Field, inputClass, Notice, SectionTitle } from '../components/ui'
import { CATEGORIES, SITUATIONS, type CategoryId } from '../data/affirmations'
import { forSituation } from '../lib/affirmations'
import { listMySuggestions, submitSuggestion, SUGGESTION_MAX, type MySuggestion } from '../lib/content'
import { useApp } from '../state/AppContext'

export function RequestAffirmation() {
  const { affirmations } = useApp()
  const [situation, setSituation] = useState<string | null>(null)
  const matches = situation ? forSituation(affirmations, situation) : []
  const chosen = SITUATIONS.find((s) => s.id === situation)

  return (
    <Page title="Request Affirmation" subtitle="What’s going on for you?">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Pick a situation">
        {SITUATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSituation(s.id)}
            aria-pressed={situation === s.id}
            className={`flex min-h-16 items-center gap-2.5 rounded-[20px] px-4 text-left text-sm transition active:scale-[0.98] ${situation === s.id ? 'bg-sunrise font-bold text-[#2b1d14] shadow-soft' : 'bg-surface font-semibold text-ink shadow-soft dark:border dark:border-line'}`}
          >
            <span className="text-2xl" aria-hidden>{s.emoji}</span> {s.label}
          </button>
        ))}
      </div>

      {chosen && (
        <section aria-live="polite">
          <SectionTitle>For “{chosen.label.toLowerCase()}”</SectionTitle>
          <ul className="space-y-3">
            {matches.map((a) => (
              <AffirmationCard key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}

      <SuggestBox />
    </Page>
  )
}

function SuggestBox() {
  const { user, accountStatus } = useApp()
  const [text, setText] = useState('')
  const [category, setCategory] = useState<CategoryId>('confidence')
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [mine, setMine] = useState<MySuggestion[]>([])
  const canSuggest = user && accountStatus === 'ready'

  useEffect(() => {
    if (canSuggest && user) listMySuggestions(user.uid).then(setMine).catch(() => undefined)
  }, [canSuggest, user])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setMsg(null)
    try {
      await submitSuggestion(user.uid, text, category)
      setText('')
      setMsg({ tone: 'success', text: 'Thanks! Our team will check it before anyone sees it.' })
      setMine(await listMySuggestions(user.uid))
    } catch (err) {
      setMsg({ tone: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8">
      <SectionTitle>Suggest a new affirmation</SectionTitle>
      {!canSuggest ? (
        <Card>
          <p className="text-ink">Got an affirmation that helped you? You can suggest it for the library.</p>
          <p className="mt-2 text-sm text-ink-2">
            To keep Unity safe, suggestions need a free account and are checked by our team first.{' '}
            <Link to="/account" className="font-semibold text-accent underline">
              Set up an account
            </Link>
          </p>
        </Card>
      ) : (
        <form onSubmit={onSubmit}>
          <Field label="Your affirmation" hint={`${text.length}/${SUGGESTION_MAX}`} htmlFor="sugg">
            <textarea id="sugg" value={text} onChange={(e) => setText(e.target.value)} maxLength={SUGGESTION_MAX} rows={3} className={inputClass} placeholder="I am…" />
          </Field>
          <Field label="Category" htmlFor="cat">
            <select id="cat" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <p className="mb-3 text-sm text-ink-2">Please don’t include names or personal details. Suggestions are checked by an admin before anyone sees them.</p>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <Button type="submit" disabled={busy || text.trim().length < 5} className="mt-3 w-full">
            {busy ? 'Sending…' : 'Send suggestion'}
          </Button>
          {mine.length > 0 && (
            <>
              <h3 className="mt-6 mb-2 font-semibold text-ink">Your suggestions</h3>
              <ul className="space-y-2">
                {mine.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface-2 p-3 text-sm text-ink">
                    <span>{s.text}</span>
                    <span className="shrink-0 text-ink-2">{s.status === 'approved' ? '✅ Approved' : s.status === 'rejected' ? 'Not used' : '⏳ Checking'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </form>
      )}
    </section>
  )
}
