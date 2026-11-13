import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../components/Layout'
import { Button, Sheet, Stars } from '../components/ui'
import { formatLong } from '../lib/dates'
import { deleteEntry, getEntry, getEntryImageUrl, type Entry } from '../lib/entries'
import { getMood } from '../lib/moods'
import { useApp } from '../state/AppContext'

export function EntryDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { refreshData, requestSync } = useApp()
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined)
  const [img, setImg] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    let url: string | null = null
    ;(async () => {
      const e = await getEntry(id)
      setEntry(e)
      if (e?.hasImage) {
        url = await getEntryImageUrl(e.id)
        setImg(url)
      }
    })()
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  if (entry === undefined) return <Page title="Entry" back="/entries">{null}</Page>
  if (entry === null)
    return (
      <Page title="Entry" back="/entries">
        <p className="text-ink-2">This entry doesn’t exist any more.</p>
      </Page>
    )

  const mood = getMood(entry.mood)
  return (
    <Page title="Journal entry" subtitle={formatLong(entry.date)} back="/entries">
      <section className="rounded-[32px] p-6 text-[#2b1d14] shadow-soft" style={{ background: mood?.color }}>
        <span className="text-5xl" aria-hidden>
          {mood?.emoji}
        </span>
        <p className="mt-3 text-sm font-semibold">One word entry · feeling {mood?.label.toLowerCase()}</p>
        <p className="font-display text-4xl font-extrabold break-words">{entry.oneWord}</p>
        <div className="mt-3">
          <Stars value={entry.stars} size={20} />
        </div>
      </section>
      {entry.journal && <p className="mt-4 rounded-[24px] bg-surface p-5 leading-relaxed whitespace-pre-wrap text-ink shadow-soft dark:border dark:border-line">{entry.journal}</p>}
      {img && <img src={img} alt="Image attached to this entry" className="mt-4 w-full rounded-[24px] shadow-soft" />}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to={`/journal/${entry.id}/edit`} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold text-ink shadow-soft">
          <Pencil size={18} aria-hidden /> Edit
        </Link>
        <Button variant="secondary" onClick={() => setConfirm(true)} className="flex items-center justify-center gap-2 !text-red-700 dark:!text-red-400">
          <Trash2 size={18} aria-hidden /> Delete
        </Button>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Delete this entry?">
        <p className="mb-4 text-ink-2">This can’t be undone.</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await deleteEntry(entry.id)
              await refreshData()
              requestSync()
              navigate('/entries', { replace: true })
            }}
          >
            Delete
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
