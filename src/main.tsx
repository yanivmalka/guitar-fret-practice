import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { LanguageProvider } from './i18n/LanguageContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)

// Retire the inline boot splash (index.html) once the app has both painted and
// finished its first data load. <App> fires a window 'app-ready' event when the
// Supabase session and (for a signed-in user) the entitlement lookup have
// resolved, so the UI never visibly flips from a guest/default state to the
// signed-in one after the splash has already gone. We still hold the splash for
// the length of its ~1.6s progress-bar animation so it reads as complete, and a
// hard cap dismisses it anyway if that signal never arrives (slow / offline
// network). Guarded so it's a no-op if the element is already gone.
{
  const splash = document.getElementById('boot-splash')
  if (splash) {
    const MIN_VISIBLE_MS = 1600
    const MAX_VISIBLE_MS = 5000
    const shownAt = performance.now()
    let dismissed = false
    const remove = () => {
      splash.classList.add('boot-splash--hide')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
      // Fallback in case the transition never fires (e.g. reduced motion).
      setTimeout(() => splash.remove(), 600)
    }
    const dismiss = () => {
      if (dismissed) return
      dismissed = true
      const held = performance.now() - shownAt
      if (held >= MIN_VISIBLE_MS) remove()
      else setTimeout(remove, MIN_VISIBLE_MS - held)
    }
    window.addEventListener('app-ready', dismiss, { once: true })
    setTimeout(dismiss, MAX_VISIBLE_MS)
  }
}
