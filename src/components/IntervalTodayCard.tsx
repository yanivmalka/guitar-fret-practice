// ── IntervalTodayCard — the guided Interval Today entry (Premium) ───────
//
// intervals-learning-spec §13 / §16.2 / task T9. The interval-domain sibling
// of `TodayCard`: shown on the Intervals page above the Interval Selector (it
// never replaces it). It surfaces:
//   • what the interval Teacher recommends drilling today, and a plain-language
//     "why these?" breakdown of the qualities it picked
//   • progress toward today's small *interval* goal (a separate record from
//     the note daily goal — OD-5)
//   • a toggle for which exercise the guided session runs (Identify the
//     interval / Find the note — default Find the note, OD-7)
//   • one button to start the recommended session, one to start a focused
//     "practise my weak intervals" session
//
// There is NO Learning-Path link — intervals has no path screen (OD-8). All
// copy goes through `t()`; the layout flips for Hebrew via `dir`.

import { useState } from 'react';
import type { DailyGoal } from '../learning/learningState';
import type { IntervalExercise } from '../utils/intervals';
import { intervalBySemitones } from '../utils/intervals';
import type {
  IntervalTeacherPlan,
  IntervalPlannedItem,
} from '../learning/intervalPlanner';
import type { IntervalWeaknessReason } from '../learning/intervalWeakness';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  todayPlan: IntervalTeacherPlan | null;
  weakSpotsPlan: IntervalTeacherPlan | null;
  /** Today's *interval* goal (separate from the note daily goal — OD-5). */
  dailyGoal: DailyGoal;
  goalComplete: boolean;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  /** Start a guided interval session: `kind` picks the daily or the
   *  weak-spots plan, `exercise` the toggle's current value. */
  onStart: (exercise: IntervalExercise, kind: 'today' | 'weak') => void;
}

function reasonLabel(t: (s: string) => string, r: IntervalWeaknessReason): string {
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

function bucketLabel(t: (s: string) => string, p: IntervalPlannedItem): string {
  if (p.reasons.length > 0) {
    return p.reasons.map((r) => reasonLabel(t, r)).join(' · ');
  }
  switch (p.bucket) {
    case 'group':
      return t('new');
    case 'confuser':
      return t('to tell apart');
    case 'consolidation':
      return t('reinforcement');
    case 'coverage':
      return t('broadening');
    default:
      return t('review');
  }
}

export default function IntervalTodayCard({
  todayPlan,
  weakSpotsPlan,
  dailyGoal,
  goalComplete,
  busy,
  onStart,
}: Props) {
  const { t, lang } = useTranslation();
  const [exercise, setExercise] = useState<IntervalExercise>('findTargetNote');
  const [showWhy, setShowWhy] = useState(false);

  if (!todayPlan) return null;

  const r = todayPlan.rationale;
  const clauses: string[] = [];
  if (r.overdue > 0) clauses.push(`${r.overdue} ${t('due for review')}`);
  if (r.weak > 0) clauses.push(`${r.weak} ${t('weak spots')}`);
  if (r.group > 0) clauses.push(`${r.group} ${t('new')}`);
  if (r.confuser > 0) clauses.push(`${r.confuser} ${t('to tell apart')}`);
  if (r.consolidation > 0) clauses.push(`${r.consolidation} ${t('to reinforce')}`);
  if (r.coverage > 0) clauses.push(`${r.coverage} ${t('new ground')}`);
  const summary =
    clauses.length > 0 ? clauses.join(' · ') : t('a fresh set to get started');

  const pct =
    dailyGoal.target > 0
      ? Math.min(100, Math.round((dailyGoal.completed / dailyGoal.target) * 100))
      : 0;

  const go = (kind: 'today' | 'weak') => {
    if (busy) return;
    if (kind === 'weak' && !weakSpotsPlan) return;
    playClickSound();
    haptic.tap();
    onStart(exercise, kind);
  };

  const pickExercise = (e: IntervalExercise) => {
    playClickSound();
    haptic.tap();
    setExercise(e);
  };

  return (
    <section
      className="teacher-card interval-card"
      dir={lang === 'he' ? 'rtl' : undefined}
      aria-label={t('Teacher')}
    >
      <header className="teacher-card-head">
        <span className="teacher-card-badge">⭐ {t('Premium')}</span>
        <h2 className="teacher-card-title">{t("Today's intervals")}</h2>
      </header>

      <p className="teacher-card-summary">
        {goalComplete ? (
          <>
            <strong>{t("Today's goal is done")} ✓</strong> — {t('one more round?')}
          </>
        ) : (
          <>
            {t('Recommended')}: {todayPlan.items.length} {t('intervals')} — {summary}
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

      <div className="interval-form-toggle" role="group" aria-label={t('Answer form')}>
        <button
          type="button"
          className={`teacher-btn${exercise === 'identifyInterval' ? ' teacher-btn-primary' : ''}`}
          aria-pressed={exercise === 'identifyInterval'}
          disabled={busy}
          onClick={() => pickExercise('identifyInterval')}
        >
          🔊 {t('Identify the interval')}
        </button>
        <button
          type="button"
          className={`teacher-btn${exercise === 'findTargetNote' ? ' teacher-btn-primary' : ''}`}
          aria-pressed={exercise === 'findTargetNote'}
          disabled={busy}
          onClick={() => pickExercise('findTargetNote')}
        >
          🔤 {t('Find the note')}
        </button>
        <button
          type="button"
          className={`teacher-btn${exercise === 'findTargetPosition' ? ' teacher-btn-primary' : ''}`}
          aria-pressed={exercise === 'findTargetPosition'}
          disabled={busy}
          onClick={() => pickExercise('findTargetPosition')}
        >
          🎸 {t('Find on the neck')}
        </button>
      </div>

      <div className="teacher-actions">
        <button
          type="button"
          className="teacher-btn teacher-btn-primary"
          disabled={busy}
          onClick={() => go('today')}
        >
          ▶ {t("Start today's practice")}
        </button>
        <button
          type="button"
          className="teacher-btn"
          disabled={busy || !weakSpotsPlan}
          onClick={() => go('weak')}
        >
          🎯 {t('Practise my weak intervals')}
        </button>
      </div>
      {!weakSpotsPlan && (
        <p className="teacher-hint">
          {t('No weak intervals yet — keep practising and the Teacher will find them.')}
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

      {showWhy && (
        <ul className="teacher-why-list">
          {todayPlan.items.map((p) => {
            const def = intervalBySemitones(p.semitones);
            return (
              <li key={p.itemId} className="teacher-why-row">
                <span className="teacher-why-pos">
                  {def?.short ?? `+${p.semitones}`}
                  {def && (
                    <span className="teacher-why-note"> → {t(def.nameKey)}</span>
                  )}
                </span>
                <span className="teacher-why-reason">{bucketLabel(t, p)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
