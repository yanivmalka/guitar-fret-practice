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
//  2. Latest-version check — on every launch we ask the service worker to
//     check for a newer deploy *now*, and if one is found we hold the splash
//     until it has installed and reload straight into it (still behind the
//     splash), so a launch always runs the newest build.
//
// There is deliberately NO hard time cap: the splash stays until that work
// genuinely finishes, however long the network takes (min-visible 1.6s so it
// never flashes). The progress bar is driven by real milestones. After a long
// wait we show a "still loading" note but keep waiting. Non-blocking failures
// (no service worker, an offline update check) are logged and skipped with no
// UI — the app runs the build it already has. The one blocking failure, a
// crash before the app is ready, shows the error and a reload button.
{
  const splash = document.getElementById('boot-splash')
  const bar = splash?.querySelector<HTMLElement>('.boot-splash__bar') ?? null
  const pctEl = splash?.querySelector<HTMLElement>('.boot-splash__pct') ?? null
  const msgEl = splash?.querySelector<HTMLElement>('.boot-splash__msg') ?? null
  const retryEl = splash?.querySelector<HTMLButtonElement>('.boot-splash__retry') ?? null

  const MIN_VISIBLE_MS = 1600
  const SLOW_NOTICE_MS = 20000
  const RECHECK_INTERVAL_MS = 60 * 60 * 1000
  const BOOT_RELOAD_KEY = 'pwa-boot-reloaded'

  const lang: 'he' | 'en' = (() => {
    try { return JSON.parse(localStorage.getItem('pref_language') || '""') === 'he' ? 'he' : 'en' }
    catch { return 'en' }
  })()
  const COPY = {
    slow: { he: 'עדיין טוען…', en: 'Still loading…' },
    crash: { he: 'האפליקציה נתקלה בשגיאה בטעינה.', en: 'The app hit an error while loading.' },
    retry: { he: 'נסה שוב', en: 'Try again' },
  } as const
  const say = (k: keyof typeof COPY) => COPY[k][lang]

  // --- progress bar: `progress` is the milestone target (jumps + a slow creep
  // between milestones); `displayed` eases toward it on a ~60fps ticker so the
  // bar and the "42%" readout visibly count up rather than snap.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let progress = 6
  let displayed = 6
  let creepTimer: ReturnType<typeof setInterval> | undefined
  let tickTimer: ReturnType<typeof setInterval> | undefined
  const render = () => {
    if (bar) bar.style.width = `${displayed}%`
    if (pctEl) pctEl.textContent = `${Math.round(displayed)}%`
  }
  const tick = () => {
    const gap = progress - displayed
    if (Math.abs(gap) < 0.1) { displayed = progress; render(); return }
    displayed += reduceMotion ? gap : gap * 0.14
    render()
  }
  const stopTicker = () => {
    if (tickTimer !== undefined) { clearInterval(tickTimer); tickTimer = undefined }
  }
  const stopCreep = () => {
    if (creepTimer !== undefined) { clearInterval(creepTimer); creepTimer = undefined }
  }
  const setProgress = (pct: number) => {
    if (pct <= progress) return
    progress = Math.min(pct, 100)
  }
  const creepTo = (ceil: number) => {
    stopCreep()
    creepTimer = setInterval(() => {
      if (progress >= ceil - 0.5) { stopCreep(); return }
      progress += (ceil - progress) * 0.08
    }, 400)
  }
  render()
  tickTimer = setInterval(tick, 16)
  setProgress(15)

  const shownAt = performance.now()
  let appReady = false
  let updateSettled = false
  let dismissed = false
  let fatal = false

  const showMsg = (text: string) => { if (msgEl) { msgEl.textContent = text; msgEl.hidden = false } }
  const clearMsg = () => {
    if (msgEl) { msgEl.textContent = ''; msgEl.hidden = true }
    if (retryEl) { retryEl.hidden = true; retryEl.onclick = null }
  }

  const hideSplash = () => {
    if (!splash) return
    splash.classList.add('boot-splash--hide')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    // Fallback in case the transition never fires (e.g. reduced motion).
    setTimeout(() => splash.remove(), 600)
  }

  const maybeDismiss = () => {
    if (dismissed || fatal || !appReady || !updateSettled) return
    dismissed = true
    stopCreep()
    setProgress(100)
    const finish = () => {
      stopTicker()
      displayed = 100
      render()
      clearMsg()
      hideSplash()
    }
    // Give the readout ~450ms to visibly run up to 100 before the fade.
    const runUp = 450
    const held = performance.now() - shownAt
    setTimeout(finish, Math.max(runUp, MIN_VISIBLE_MS - held))
  }

  const markUpdateSettled = () => {
    if (updateSettled) return
    updateSettled = true
    setProgress(appReady ? 100 : 70)
    maybeDismiss()
  }

  window.addEventListener('app-ready', () => {
    appReady = true
    // A crash message shown earlier was provisional — the app recovered.
    if (fatal) {
      fatal = false
      clearMsg()
      if (tickTimer === undefined && !dismissed) tickTimer = setInterval(tick, 16)
    }
    setProgress(updateSettled ? 100 : 92)
    maybeDismiss()
  }, { once: true })

  // No time cap — just reassure the user the splash isn't dead after a while.
  setTimeout(() => { if (!dismissed && !fatal) showMsg(say('slow')) }, SLOW_NOTICE_MS)

  // The only blocking failure: an uncaught error before the app is ready. Show
  // it with a reload button; if 'app-ready' still fires later, it clears itself.
  const onBootError = (detail: string) => {
    if (appReady || dismissed || fatal) return
    fatal = true
    stopCreep()
    stopTicker() // freeze the readout where it stalled
    showMsg(detail ? `${say('crash')} (${detail})` : say('crash'))
    if (retryEl) {
      retryEl.textContent = say('retry')
      retryEl.hidden = false
      retryEl.onclick = () => window.location.reload()
    }
  }
  window.addEventListener('error', (e) => onBootError(e.message || 'error'))
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string } | string | undefined
    onBootError((typeof r === 'string' ? r : r?.message) || 'promise rejection')
  })

  let swRegistration: ServiceWorkerRegistration | undefined

  // On every launch: check for a newer deploy now, and if one is found hold the
  // splash until it has installed, then reload into it — the reload that
  // vite-plugin-pwa fires from its own `activated` handler happens behind the
  // splash. NB: `onNeedRefresh` is never called under registerType:'autoUpdate',
  // so this lives in `onRegisteredSW`, not there.
  async function applyNewestThenSettle(reg: ServiceWorkerRegistration) {
    let bootReloaded = false
    try { bootReloaded = sessionStorage.getItem(BOOT_RELOAD_KEY) === '1' } catch { /* private mode */ }

    try {
      await reg.update()
    } catch (err) {
      // Offline / server error — non-blocking, run the cached build. No UI.
      console.warn('[pwa] update check failed', err)
      try { sessionStorage.removeItem(BOOT_RELOAD_KEY) } catch { /* ignore */ }
      markUpdateSettled()
      return
    }

    const installing = reg.installing
    if (installing && !reg.waiting) {
      creepTo(60)
      await new Promise<void>((resolve) => {
        const settled = () => { if (installing.state !== 'installing') { resolve(); return true } return false }
        installing.addEventListener('statechange', settled)
        settled() // guard the race where it left 'installing' before this ran
      })
      stopCreep()
    }

    // A newer build finished installing. Reload into it while the splash is
    // still up — once per launch only, so a worker that fails to take over
    // can't spin us in a reload loop.
    if ((reg.installing || reg.waiting) && !bootReloaded) {
      try { sessionStorage.setItem(BOOT_RELOAD_KEY, '1') } catch { /* ignore */ }
      setProgress(66)
      window.location.reload()
      return
    }

    try { sessionStorage.removeItem(BOOT_RELOAD_KEY) } catch { /* ignore */ }
    markUpdateSettled()
  }

  if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
    // Dev has no service worker (registerSW is a no-op that never calls back);
    // neither do older browsers. Nothing to check — settle straight away.
    markUpdateSettled()
  } else {
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, reg) {
        if (!reg) { markUpdateSettled(); return }
        swRegistration = reg
        setProgress(30)
        void applyNewestThenSettle(reg)
        setInterval(() => { void reg.update() }, RECHECK_INTERVAL_MS)
      },
      onRegisterError(err) {
        // Non-blocking: the app runs fine without a service worker (no offline
        // cache, no auto-update). Log and carry on — no UI.
        console.warn('[pwa] service worker registration failed', err)
        markUpdateSettled()
      },
    })
  }

  // The build-info "↻" button calls this instead of a bare location.reload().
  // A plain reload just re-serves the cached build, so a fresh deploy only
  // showed up after the hourly re-check or a cold launch. Here we ask the
  // service worker to check *now*. Under `registerType: 'autoUpdate'` the
  // generated SW self-skips-waiting and vite-plugin-pwa reloads the page from
  // its own `activated` handler once the new worker takes control — so we just
  // wait briefly for that hand-over and otherwise fall back to a plain reload.
  // (The `updateSW()` returned by registerSW() is a no-op in autoUpdate mode,
  // so it must not be relied on here.)
  window.__applyUpdate = async () => {
    const reg = swRegistration
    if (!reg) { window.location.reload(); return }
    try { await reg.update() } catch { /* offline — fall through to a plain reload */ }

    if (reg.installing || reg.waiting) {
      const handedOver = await new Promise<boolean>((resolve) => {
        navigator.serviceWorker.addEventListener(
          'controllerchange', () => resolve(true), { once: true },
        )
        setTimeout(() => resolve(false), 6000)
      })
      if (handedOver) return // the plugin's `activated` handler is reloading us
    }
    window.location.reload()
  }
}
