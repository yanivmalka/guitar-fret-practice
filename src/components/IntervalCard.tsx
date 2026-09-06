// ── IntervalCard — the Premium interval-drill entry point (P4) ──────────
//
// premium-product-plan.md §9 P4, first vertical slice. Shown only to Premium
// users, at rest, beside the Selector (like TodayCard — it never replaces the
// Selector). Picks the answer form and starts an interval session; the session
// then runs through the same engine / scoring / timers as every other drill.
//
// Reuses the Teacher card's styling classes so the two Premium cards read as
// one surface. All copy through `t()`; layout flips for Hebrew via `dir`.

import { useState } from 'react';
import type { IntervalForm } from '../utils/intervals';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  /** Distinct interval qualities the SRS schedule is tracking so far. */
  trackedCount: number;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  onStart: (form: IntervalForm) => void;
}

export default function IntervalCard({ trackedCount, busy, onStart }: Props) {
  const { t, lang } = useTranslation();
  const [form, setForm] = useState<IntervalForm>('onNeck');

  const go = () => {
    if (busy) return;
    playClickSound();
    haptic.tap();
    onStart(form);
  };

  const pick = (f: IntervalForm) => {
    playClickSound();
    haptic.tap();
    setForm(f);
  };

  return (
    <section
      className="teacher-card interval-card"
      dir={lang === 'he' ? 'rtl' : undefined}
      aria-label={t('Interval training')}
    >
      <header className="teacher-card-head">
        <span className="teacher-card-badge">⭐ {t('Premium')}</span>
        <h2 className="teacher-card-title">{t('Interval training')}</h2>
      </header>

      <p className="teacher-card-summary">
        {t('Hear and find the distance between two notes.')}
        {trackedCount > 0 && (
          <> {' — '}{trackedCount} {t('intervals tracked')}</>
        )}
      </p>

      <div className="interval-form-toggle" role="group" aria-label={t('Answer form')}>
        <button
          type="button"
          className={`teacher-btn${form === 'onNeck' ? ' teacher-btn-primary' : ''}`}
          aria-pressed={form === 'onNeck'}
          disabled={busy}
          onClick={() => pick('onNeck')}
        >
          🎸 {t('Find it on the neck')}
        </button>
        <button
          type="button"
          className={`teacher-btn${form === 'byName' ? ' teacher-btn-primary' : ''}`}
          aria-pressed={form === 'byName'}
          disabled={busy}
          onClick={() => pick('byName')}
        >
          🔤 {t('Name the note')}
        </button>
      </div>

      <div className="teacher-actions">
        <button
          type="button"
          className="teacher-btn teacher-btn-primary"
          disabled={busy}
          onClick={go}
        >
          ▶ {t('Start interval practice')}
        </button>
      </div>
    </section>
  );
}
