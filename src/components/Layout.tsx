import { ArrowLeft, BarChart3, Heart, HeartPulse, Home, Info, Menu, MessageCircle, Settings, Shield, Sparkles, User, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { HelpButton } from './HelpSheet'
import { LogoMark, Wordmark } from './Logo'

const TABS = [
  { to: '/', label: 'Welcome', icon: Home },
  { to: '/affirmations', label: 'Affirmations', icon: Heart },
  { to: '/request', label: 'Request', icon: Sparkles },
  { to: '/resources', label: 'Resources', icon: MessageCircle },
]

const MENU = [
  { to: '/entries', label: 'Mood tracker & journal', icon: BarChart3 },
  { to: '/health', label: 'Health', icon: HeartPulse },
  { to: '/account', label: 'Account & sync', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/privacy', label: 'Privacy', icon: Shield },
  { to: '/about', label: 'About Unity', icon: Info },
]

export function Page({
  title,
  subtitle,
  back,
  children,
  eyebrow,
  hideTitle,
}: {
  title: string
  subtitle?: string
  back?: boolean | string
  children: ReactNode
  eyebrow?: ReactNode
  /** Visually hide the big title (still announced to screen readers). */
  hideTitle?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    document.title = `${title} · Unity`
  }, [title])
  useEffect(() => {
    setMenuOpen(false)
  }, [loc.pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <header className={`pt-safe sticky top-0 z-30 transition-colors ${scrolled ? 'border-b border-line bg-[var(--bg)]/85 backdrop-blur-xl' : ''}`}>
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-2 px-3">
          {back ? (
            <button
              onClick={() => (typeof back === 'string' ? navigate(back) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
              aria-label="Back"
              className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-soft"
            >
              <ArrowLeft size={20} aria-hidden />
            </button>
          ) : (
            <button onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-soft">
              <Menu size={20} aria-hidden />
            </button>
          )}
          <div className="flex min-w-0 flex-1 justify-center">
            <span className={`truncate font-display text-base font-bold text-ink transition-opacity ${scrolled || hideTitle ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
              {hideTitle && !scrolled ? <LogoMark size={30} /> : title}
            </span>
          </div>
          <HelpButton compact />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-5 pt-1 pb-32">
        <div className={hideTitle ? 'sr-only' : 'mb-5 animate-rise'}>
          {eyebrow && <div className="mb-1 text-sm font-semibold text-accent">{eyebrow}</div>}
          <h1 className="text-[2rem] leading-tight font-extrabold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-2">{subtitle}</p>}
        </div>
        {children}
      </main>

      <TabBar />
      {menuOpen && <Drawer onClose={() => setMenuOpen(false)} />}
    </div>
  )
}

function TabBar() {
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 px-3 pb-3">
      <ul className="mx-auto grid max-w-md grid-cols-4 rounded-[28px] border border-line bg-[var(--surface)]/85 p-1.5 shadow-soft backdrop-blur-xl">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'} className={({ isActive }) => `group flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[22px] px-1 text-[0.7rem] leading-tight transition ${isActive ? 'bg-cream-t font-bold text-accent' : 'font-medium text-ink-2'}`}>
              {({ isActive }) => (
                <>
                  <Icon size={22} aria-hidden strokeWidth={isActive ? 2.4 : 1.9} />
                  <span className="max-w-full truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Drawer({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <nav aria-label="Menu" className="pt-safe absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col rounded-r-[32px] bg-[var(--bg)] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <Wordmark size={34} />
          <button onClick={onClose} aria-label="Close menu" autoFocus className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-soft">
            <X size={20} aria-hidden />
          </button>
        </div>
        <ul className="flex-1 space-y-1 px-3">
          {MENU.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="flex min-h-13 items-center gap-3 rounded-2xl px-3 font-semibold text-ink hover:bg-surface">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cream-t text-accent">
                  <Icon size={20} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="pb-safe p-5">
          <HelpButton />
          <p className="mt-3 text-xs text-ink-2">Made for teenagers by teenagers 🧡</p>
        </div>
      </nav>
    </div>
  )
}
