// ── IntervalCard — the Premium interval-drill entry point ──────────────
//
// Shown only to Premium users, at rest, beside the Selector (like TodayCard —
// it never replaces the Selector). Picks which of the two exercises
// (intervals-learning-spec §8.1) to drill and starts an interval session; the
// session then runs through the same engine / scoring / timers as every other
// drill. Direction defaults to Both — a Selector control for it lands in T6.
//
// Reuses the Teacher card's styling classes so the two Premium cards read as
// one surface. All copy through `t()`; layout flips for Hebrew via `dir`.

import { useState } from 'react';
import type { IntervalExercise } from '../utils/intervals';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  /** Distinct interval qualities the SRS schedule is tracking so far. */
  trackedCount: number;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  onStart: (exercise: IntervalExercise) => void;
}

export default function IntervalCard({ trackedCount, busy, onStart }: Props) {
  const { t, lang } = useTranslation();
  const [exercise, setExercise] = useState<IntervalExercise>('findTargetNote');

  const go = () => {
    if (busy) return;
    playClickSound();
    haptic.tap();
    onStart(exercise);
  };

  const pick = (e: IntervalExercise) => {
    playClickSound();
    haptic.tap();
    setExercise(e);
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
          className={`teacher-btn${exercise === 'identifyInterval' ? ' teacher-btn-primary' : ''}`}
          aria-pressed={exercise === 'identifyInterval'}
          disabled={busy}
          onClick={() => pick('identifyInterval')}
        >
          🔊 {t('Identify the interval')}
        </button>
        <button
          type="button"
          className={`teacher-btn${exercise === 'findTargetNote' ? ' teacher-btn-primary' : ''}`}
          aria-pressed={exercise === 'findTargetNote'}
          disabled={busy}
          onClick={() => pick('findTargetNote')}
        >
          🔤 {t('Find the note')}
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
