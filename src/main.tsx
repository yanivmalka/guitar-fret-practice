import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
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

// Retire the inline boot splash (index.html) once the app has done its first
// real work behind it. Two things must settle before we fade it out:
//
//  1. First data load — <App> fires a window 'app-ready' event when the
//     Supabase session and (for a signed-in user) the entitlement lookup have
//     resolved, so the UI never visibly flips from a guest/default state to
//     the signed-in one after the splash has already gone.
//
//  2. Latest-version check — while the splash is up we ask the service worker
//     to check for a newer deploy. If one is found we activate it and reload
//     straight into it (still behind the splash), so a launch always runs the
//     newest build instead of updating silently mid-session. A newer build
//     that lands *after* boot is just picked up on the next launch; an hourly
//     re-check covers very long-lived sessions.
//
// The splash still enforces its own minimum-visible and hard-cap timers, so a
// guest build, a stalled network, or a silent service-worker failure can never
// leave it stuck on screen.
{
  const splash = document.getElementById('boot-splash')
  const MIN_VISIBLE_MS = 1600
  const MAX_VISIBLE_MS = 6000
  const UPDATE_CHECK_CAP_MS = 4000
  const RECHECK_INTERVAL_MS = 60 * 60 * 1000
  const BOOT_RELOAD_KEY = 'pwa-boot-reloaded'

  const shownAt = performance.now()
  let booting = true
  let appReady = false
  let updateSettled = false
  let dismissed = false

  const hideSplash = () => {
    if (!splash) return
    splash.classList.add('boot-splash--hide')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    // Fallback in case the transition never fires (e.g. reduced motion).
    setTimeout(() => splash.remove(), 600)
  }

  const maybeDismiss = () => {
    if (dismissed || !appReady || !updateSettled) return
    dismissed = true
    booting = false
    const held = performance.now() - shownAt
    if (held >= MIN_VISIBLE_MS) hideSplash()
    else setTimeout(hideSplash, MIN_VISIBLE_MS - held)
  }

  const markUpdateSettled = () => {
    updateSettled = true
    maybeDismiss()
  }

  window.addEventListener('app-ready', () => {
    appReady = true
    maybeDismiss()
  }, { once: true })

  // Hard caps: dismiss no matter what, and stop treating a late update as a
  // boot-time reload once the splash is (or should be) gone.
  setTimeout(markUpdateSettled, UPDATE_CHECK_CAP_MS)
  setTimeout(() => {
    booting = false
    appReady = true
    markUpdateSettled()
  }, MAX_VISIBLE_MS)

  let swRegistration: ServiceWorkerRegistration | undefined

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // A newer build is installed and waiting. If we're still on the splash,
      // swap to it now and reload; the sessionStorage guard prevents a loop if
      // the reload somehow doesn't clear the waiting worker.
      let alreadyReloaded = false
      try {
        alreadyReloaded = sessionStorage.getItem(BOOT_RELOAD_KEY) === '1'
      } catch { /* storage blocked (private mode) — treat as first try */ }
      if (booting && !alreadyReloaded) {
        try { sessionStorage.setItem(BOOT_RELOAD_KEY, '1') } catch { /* ignore */ }
        void updateSW(true)
        return
      }
      markUpdateSettled()
    },
    onRegisteredSW(_swUrl, reg) {
      try { sessionStorage.removeItem(BOOT_RELOAD_KEY) } catch { /* ignore */ }
      if (!reg) { markUpdateSettled(); return }
      swRegistration = reg
      // Kick an immediate check instead of waiting for the browser's own.
      Promise.resolve(reg.update()).catch(() => {}).finally(() => {
        // If nothing is installing, onNeedRefresh won't fire — settle now.
        if (!reg.installing && !reg.waiting) markUpdateSettled()
      })
      setInterval(() => { void reg.update() }, RECHECK_INTERVAL_MS)
    },
    onRegisterError() { markUpdateSettled() },
  })

  // The build-info "↻" button calls this instead of a bare location.reload().
  // A plain reload just re-serves the cached build, so a fresh deploy only
  // showed up after the hourly re-check or a cold launch. Here we ask the
  // service worker to check *now*, wait for any newer build to finish
  // installing, then activate it and reload straight into it.
  window.__applyUpdate = async () => {
    const reg = swRegistration
    if (!reg) { window.location.reload(); return }
    try { await reg.update() } catch { /* offline — fall through to a plain reload */ }

    const installing = reg.installing
    if (installing && !reg.waiting) {
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' || installing.state === 'activated' || installing.state === 'redundant') done()
        })
        setTimeout(done, 8000)
      })
    }

    if (reg.waiting) await updateSW(true) // skipWaiting + auto-reload into the new build
    else window.location.reload()
  }
}
