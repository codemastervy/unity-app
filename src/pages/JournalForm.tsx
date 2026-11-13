import { Calendar, ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Button, Field, inputClass, Notice, Stars } from '../components/ui'
import { isValidISODate, todayISO } from '../lib/dates'
import { getEntry, getEntryImageUrl, LIMITS, prepareImage, saveEntry } from '../lib/entries'
import { MOODS, type MoodId } from '../lib/moods'
import { useApp } from '../state/AppContext'

export function JournalForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refreshData, requestSync } = useApp()
  const initialDate = params.get('date')
  const [journal, setJournal] = useState('')
  const [oneWord, setOneWord] = useState('')
  const [date, setDate] = useState(initialDate && isValidISODate(initialDate) && initialDate <= todayISO() ? initialDate : todayISO())
  const initialMood = params.get('mood')
  const [mood, setMood] = useState<MoodId | ''>(MOODS.some((m) => m.id === initialMood) ? (initialMood as MoodId) : '')
  const [stars, setStars] = useState(0)
  const [image, setImage] = useState<Blob | null | undefined>(undefined)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    let url: string | null = null
    ;(async () => {
      const e = await getEntry(id)
      if (!e) return navigate('/entries', { replace: true })
      setJournal(e.journal)
      setOneWord(e.oneWord)
      setDate(e.date)
      setMood(e.mood)
      setStars(e.stars)
      if (e.hasImage) {
        url = await getEntryImageUrl(e.id)
        setPreview(url)
      }
    })()
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [id, navigate])

  const canSubmit = oneWord.trim().length > 0 && !!mood && isValidISODate(date) && !saving

  async function onPickImage(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Please pick an image file.')
    const blob = await prepareImage(file)
    setImage(blob)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(blob))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || !mood) return
    setSaving(true)
    setError('')
    try {
      const savedId = await saveEntry({ date, mood, stars, oneWord, journal, image }, id)
      await refreshData()
      requestSync()
      navigate(`/entries/${savedId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Page title={id ? 'Edit your entry' : 'Add to your journal'} subtitle={id ? undefined : 'Only you can read this. It’s locked on your device.'} back>
      <form onSubmit={onSubmit} noValidate className="space-y-1">
        <Field label="Scribble pad. Type away here:" htmlFor="journal">
          <textarea id="journal" value={journal} onChange={(e) => setJournal(e.target.value)} maxLength={LIMITS.journal} rows={7} className={`${inputClass} resize-y`} placeholder="Whatever’s on your mind…" />
        </Field>

        <Field label="One word to remember today:" hint="Required" htmlFor="oneword">
          <input id="oneword" value={oneWord} onChange={(e) => setOneWord(e.target.value)} maxLength={LIMITS.oneWord} required aria-required className={inputClass} autoComplete="off" />
        </Field>

        <Field label="Date" htmlFor="date">
          <div className="relative">
            <Calendar className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2" size={20} aria-hidden />
            <input id="date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} className={`${inputClass} pl-11`} />
          </div>
        </Field>

        <fieldset className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <legend className="font-semibold text-ink">Pick an emoji that describes today</legend>
            <span className="text-sm text-ink-2">Required</span>
          </div>
          <div role="radiogroup" aria-label="Mood" className="grid grid-cols-4 gap-2">
            {MOODS.map((m) => {
              const on = mood === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMood(m.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-3 transition active:scale-95 ${on ? 'shadow-soft ring-[3px] ring-[var(--accent-ink)]' : 'bg-surface-2'}`}
                  style={on ? { background: m.color } : undefined}
                >
                  <span className="text-3xl" aria-hidden>
                    {m.emoji}
                  </span>
                  <span className={`text-xs font-semibold ${on ? 'text-[#2b1d14]' : 'text-ink'}`}>{m.label}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-2 px-4 py-2">
          <span className="font-semibold text-ink" id="rate-label">
            Rate today
          </span>
          <Stars value={stars} onChange={setStars} />
        </div>

        <Field label="Pick an image" hint="Stays on this device" htmlFor="image">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Your chosen image" className="max-h-64 w-full rounded-xl object-cover" />
              <button type="button" onClick={() => { setImage(null); setPreview(null) }} className="absolute top-2 right-2 flex min-h-11 items-center gap-1 rounded-full bg-black/70 px-3 text-sm text-white">
                <Trash2 size={16} aria-hidden /> Remove
              </button>
            </div>
          ) : (
            <label htmlFor="image" className={`${inputClass} flex cursor-pointer items-center gap-3 text-ink-2`}>
              <ImagePlus size={20} aria-hidden /> Choose an image…
            </label>
          )}
          <input id="image" type="file" accept="image/*" className="sr-only" onChange={(e) => void onPickImage(e.target.files?.[0])} />
        </Field>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="sticky bottom-24 z-10 mt-6 grid grid-cols-2 gap-3 rounded-[24px] bg-[var(--bg)]/90 p-2 backdrop-blur-xl">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {saving ? 'Saving…' : 'Submit'}
          </Button>
        </div>
        {!canSubmit && !saving && <p className="text-center text-sm text-ink-2">Add one word and pick an emoji to submit.</p>}
      </form>
    </Page>
  )
}
