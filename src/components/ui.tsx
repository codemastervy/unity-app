import { Star, X } from 'lucide-react'
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-sunrise text-[#2b1d14] font-bold shadow-soft disabled:opacity-45 disabled:shadow-none',
    secondary: 'bg-surface text-ink border border-line font-semibold',
    ghost: 'text-accent font-semibold',
    danger: 'bg-red-700 text-white font-bold disabled:opacity-45',
  }
  return <button className={`min-h-12 rounded-2xl px-5 py-3 transition active:scale-[0.97] disabled:cursor-not-allowed ${styles[variant]} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-surface p-5 shadow-soft dark:border dark:border-line ${className}`}>{children}</div>
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`mt-8 mb-3 text-xl font-bold text-ink ${className}`}>{children}</h2>
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="font-semibold text-ink">
          {label}
        </label>
        {hint && <span className="text-sm text-ink-2">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-2 transition focus:border-[var(--accent-ink)] focus:outline-none'

export function Stars({ value, onChange, size = 28, label = 'Rate today' }: { value: number; onChange?: (v: number) => void; size?: number; label?: string }) {
  if (!onChange) {
    return (
      <span className="inline-flex gap-0.5" role="img" aria-label={value ? `${value} out of 5 stars` : 'Not rated'}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} size={size} aria-hidden className={n <= value ? 'fill-brand text-brand' : 'text-ink-2'} />
        ))}
      </span>
    )
  }
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(value === n ? 0 : n)}
          className="grid min-h-11 min-w-11 place-items-center rounded-lg"
        >
          <Star size={size} aria-hidden className={n <= value ? 'fill-brand text-brand' : 'text-ink-2'} />
        </button>
      ))}
    </div>
  )
}

/** Accessible bottom sheet / dialog. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const els = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')
        if (!els.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pb-safe animate-rise relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-surface p-6 shadow-2xl focus:outline-none sm:rounded-[32px]"
      >
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-[var(--border)] sm:hidden" aria-hidden />
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-2xl font-bold text-ink">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="grid min-h-11 min-w-11 place-items-center rounded-full bg-surface-2 text-ink">
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        {description && <p className="text-sm text-ink-2">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[var(--accent-ink)]' : 'bg-gray-400 dark:bg-zinc-600'}`}
      >
        <span className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition ${checked ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'success' }) {
  const cls = {
    info: 'bg-cream-t text-ink',
    error: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
    success: 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  )
}
