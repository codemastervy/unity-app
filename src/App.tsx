import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { HelpSheet } from './components/HelpSheet'
import { AccountPage } from './pages/Account'
import { AllAffirmations } from './pages/AllAffirmations'
import { EntryDetail } from './pages/EntryDetail'
import { Health } from './pages/Health'
import { About, Privacy } from './pages/Info'
import { JournalForm } from './pages/JournalForm'
import { LockScreen } from './pages/Lock'
import { MoodTracker } from './pages/MoodTracker'
import { Onboarding } from './pages/Onboarding'
import { RequestAffirmation } from './pages/RequestAffirmation'
import { Resources } from './pages/Resources'
import { SettingsPage } from './pages/Settings'
import { Welcome } from './pages/Welcome'
import { AppProvider, useApp } from './state/AppContext'

function useAppLock() {
  const { ready, settings } = useApp()
  const [locked, setLocked] = useState(true)
  const hiddenAt = useRef<number | null>(null)
  const initialised = useRef(false)

  useEffect(() => {
    if (!ready || initialised.current) return
    initialised.current = true
    setLocked(settings.lock.enabled)
  }, [ready, settings.lock.enabled])

  useEffect(() => {
    if (!settings.lock.enabled) return setLocked(false)
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current >= settings.lock.timeoutMins * 60_000) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [settings.lock.enabled, settings.lock.timeoutMins])

  return { locked: ready && settings.lock.enabled && locked, unlock: useCallback(() => setLocked(false), []) }
}

function Shell() {
  const { ready, settings } = useApp()
  const { locked, unlock } = useAppLock()
  const loc = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [loc.pathname])

  if (!ready) return <div className="bg-app min-h-dvh" aria-busy="true" />
  let content
  if (locked) content = <LockScreen onUnlock={unlock} />
  else if (!settings.consentVersion && loc.pathname !== '/privacy') content = <Onboarding />
  else
    content = (
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/affirmations" element={<AllAffirmations />} />
        <Route path="/request" element={<RequestAffirmation />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/entries" element={<MoodTracker />} />
        <Route path="/entries/:id" element={<EntryDetail />} />
        <Route path="/journal/new" element={<JournalForm />} />
        <Route path="/journal/:id/edit" element={<JournalForm />} />
        <Route path="/health" element={<Health />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  return (
    <>
      {content}
      <HelpSheet />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <Shell />
      </BrowserRouter>
    </AppProvider>
  )
}
