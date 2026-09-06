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

// Retire the inline boot splash (index.html) once React has painted. Hold it
// long enough for its ~1.6s progress-bar animation to read as complete, then
// fade out and remove. Guarded so it's a no-op if the element is already gone.
{
  const splash = document.getElementById('boot-splash')
  if (splash) {
    const dismiss = () => {
      splash.classList.add('boot-splash--hide')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
      // Fallback in case the transition never fires (e.g. reduced motion).
      setTimeout(() => splash.remove(), 600)
    }
    setTimeout(dismiss, 1600)
  }
}
