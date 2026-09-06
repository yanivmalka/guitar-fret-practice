// ── TodayCard — the Premium Teacher entry point, beside the Selector ─────
//
// premium-product-plan.md §6 P2 / task §8. Shown only to Premium users, at
// rest, above the Selector (it never replaces it). It surfaces:
//   • what the Teacher recommends practising today, and a plain-language
//     "why these?" breakdown
//   • progress toward today's small practice goal
//   • one button to start the recommended session
//   • one button to start a focused "practise my weak spots" session
//
// All copy goes through `t()`; the layout flips for Hebrew via `dir`.

import { useState } from 'react';
import type { AccidentalMode, NotationMode } from '../utils/music';
import { notes, displayNote } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import type { TeacherPlan, PlannedItem } from '../learning/planner';
import type { DailyGoal } from '../learning/learningState';
import type { WeaknessReason } from '../learning/weakness';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  todayPlan: TeacherPlan | null;
  weakSpotsPlan: TeacherPlan | null;
  dailyGoal: DailyGoal;
  goalComplete: boolean;
  accidental: AccidentalMode;
  notation: NotationMode;
  instrument: InstrumentConfig;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  onStart: (plan: TeacherPlan) => void;
  /** Open the full Learning Path screen (P3). Omitted ⇒ the link is hidden. */
  onOpenPath?: () => void;
}

function reasonLabel(t: (s: string) => string, r: WeaknessReason): string {
  switch (r) {
    case 'overdue':
      return t('due for review');
    case 'lowAccuracy':
      return t('often missed');
    case 'slow':
      return t('slow to recall');
    case 'recentMistakes':
      return t('recent slips');
  }
}

function bucketLabel(t: (s: string) => string, p: PlannedItem): string {
  if (p.reasons.length > 0) {
    return p.reasons.map((r) => reasonLabel(t, r)).join(' · ');
  }
  if (p.bucket === 'consolidation') return t('reinforcement');
  if (p.bucket === 'coverage') return t('not practised much');
  return t('review');
}

export default function TodayCard({
  todayPlan,
  weakSpotsPlan,
  dailyGoal,
  goalComplete,
  accidental,
  notation,
  instrument,
  busy,
  onStart,
  onOpenPath,
}: Props) {
  const { t, lang } = useTranslation();
  const [showWhy, setShowWhy] = useState(false);

  if (!todayPlan) return null;

  const r = todayPlan.rationale;
  const clauses: string[] = [];
  if (r.overdue > 0) clauses.push(`${r.overdue} ${t('due for review')}`);
  if (r.weak > 0) clauses.push(`${r.weak} ${t('weak spots')}`);
  if (r.consolidation > 0) clauses.push(`${r.consolidation} ${t('to reinforce')}`);
  if (r.coverage > 0) clauses.push(`${r.coverage} ${t('new ground')}`);
  const summary =
    clauses.length > 0 ? clauses.join(' · ') : t('a fresh set to get started');

  const pct =
    dailyGoal.target > 0
      ? Math.min(100, Math.round((dailyGoal.completed / dailyGoal.target) * 100))
      : 0;

  const go = (plan: TeacherPlan) => {
    if (busy) return;
    playClickSound();
    haptic.tap();
    onStart(plan);
  };

  const noteAt = (string: number, fret: number): string => {
    const raw = notes[string - 1]?.[fret];
    return raw ? displayNote(raw, accidental, notation) : '';
  };

  return (
    <section
      className="teacher-card"
      dir={lang === 'he' ? 'rtl' : undefined}
      aria-label={t('Teacher')}
    >
      <header className="teacher-card-head">
        <span className="teacher-card-badge">⭐ {t('Premium')}</span>
        <h2 className="teacher-card-title">{t('Today with your Teacher')}</h2>
      </header>

      <p className="teacher-card-summary">
        {goalComplete ? (
          <>
            <strong>{t("Today's goal is done")} ✓</strong> — {t('one more round?')}
          </>
        ) : (
          <>
            {t('Recommended')}: {todayPlan.items.length} {t('positions')} — {summary}
          </>
        )}
      </p>

      <div className="teacher-goal">
        <div className="teacher-goal-bar" aria-hidden="true">
          <span className="teacher-goal-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="teacher-goal-label">
          {t('Daily goal')}: {dailyGoal.completed}/{dailyGoal.target}
        </span>
      </div>

      <div className="teacher-actions">
        <button
          type="button"
          className="teacher-btn teacher-btn-primary"
          disabled={busy}
          onClick={() => go(todayPlan)}
        >
          ▶ {t("Start today's practice")}
        </button>
        <button
          type="button"
          className="teacher-btn"
          disabled={busy || !weakSpotsPlan}
          onClick={() => weakSpotsPlan && go(weakSpotsPlan)}
        >
          🎯 {t('Practise my weak spots')}
        </button>
      </div>
      {!weakSpotsPlan && (
        <p className="teacher-hint">
          {t('No weak spots yet — keep practising and the Teacher will find them.')}
        </p>
      )}

      <button
        type="button"
        className="teacher-why-toggle"
        aria-expanded={showWhy}
        onClick={() => {
          playClickSound();
          haptic.tap();
          setShowWhy((v) => !v);
        }}
      >
        {showWhy ? t('Hide why') : t('Why these?')}
      </button>

      {onOpenPath && (
        <button
          type="button"
          className="teacher-path-link"
          onClick={() => {
            playClickSound();
            haptic.tap();
            onOpenPath();
          }}
        >
          🧭 {t('View your Learning Path')}
        </button>
      )}

      {showWhy && (
        <ul className="teacher-why-list">
          {todayPlan.items.map((p) => (
            <li key={p.itemId} className="teacher-why-row">
              <span className="teacher-why-pos">
                {t(instrument.stringLabels[p.string] ?? `String ${p.string}`)} ·{' '}
                {t('fret')} {p.fret}
                {noteAt(p.string, p.fret) && (
                  <span className="teacher-why-note"> → {noteAt(p.string, p.fret)}</span>
                )}
              </span>
              <span className="teacher-why-reason">{bucketLabel(t, p)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
