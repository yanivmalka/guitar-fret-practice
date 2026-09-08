// ── IntervalSelectorPanel — the Interval Selector UI ───────────────────
//
// The body of the "Intervals" learning page (intervals-learning-spec §5, task
// T6). Rebuilt to read as the *same surface* as the Notes `SelectorPanel`:
//
//   • Intervals pick through the strings-selector pills (`.string-pill`) with
//     the same on/off lighting, and a dashed `Multi` toggle in the same row.
//   • Direction is two independent tiles (Ascending / Descending) on the
//     difficulty-road track — either or both, but never neither, exactly like
//     the neck half-picker.
//   • Exercise picks through the `.mode-card` squares.
//   • Difficulty is the `focused → mixed → full` road.
//
// No `.teacher-card` chrome and no bespoke design system. All copy through
// `t()`; the layout flips for Hebrew via `dir`. Deliberately no Auto Advance
// toggle (§5.5).

import { Fragment, type ReactElement } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import type { AccidentalMode, NotationMode, OrderMode } from '../utils/music';
import type { DrillConfig } from '../drill/DrillConfig';
import { INTERVALS, intervalBySemitones, type IntervalExercise } from '../utils/intervals';
import { intervalContentBySemitones } from '../learning/intervalContent';
import {
  useIntervalSelector,
  type IntervalDifficulty,
} from '../hooks/useIntervalSelector';
import { useTranslation } from '../i18n/useTranslation';
import {
  playClickSound, playToggleOnSound, playToggleOffSound, haptic,
} from '../utils/feedback';

interface Props {
  instrument: InstrumentConfig;
  /** Semitone sizes currently mastered — seeds the first-run selection (§5.2). */
  masteredSizes: number[];
  accidental: AccidentalMode;
  order: OrderMode;
  /** Note-name notation — rides the built drill's `interval` spec so the
   *  engine's interval feedback matches `IntervalPrompt`'s spelling (#6). */
  notation: NotationMode;
  /** Distinct interval qualities the SRS schedule is tracking so far. */
  trackedCount: number;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  /** Silent mode is on — drill-content audio is muted app-wide. "Identify the
   *  interval" is audio-only, so it is unavailable while this is true. */
  silentMode?: boolean;
  onStart: (config: DrillConfig) => void;
}

const DIFFICULTY_LABELS: Record<IntervalDifficulty, string> = {
  focused: 'Focused',
  mixed: 'Mixed',
  full: 'Full',
};
const DIFFICULTY_ICONS: Record<IntervalDifficulty, string> = {
  focused: '◎',
  mixed: '◐',
  full: '◍',
};
const DIFFICULTY_ORDER: IntervalDifficulty[] = ['focused', 'mixed', 'full'];

// Exercise squares — one `.mode-card` each, a small glyph over the label,
// mirroring the Notes mode selector's Note-by-Fret / Fret-by-Note cards.
const EXERCISE_ORDER: IntervalExercise[] = [
  'identifyInterval',
  'findTargetNote',
  'findTargetPosition',
];
const EXERCISE_META: Record<IntervalExercise, { label: string; glyph: ReactElement }> = {
  identifyInterval: {
    label: 'Identify the interval',
    glyph: (
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M5 13h5l6-5v18l-6-5H5z" fill="currentColor" />
        <path d="M21 11a7 7 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M25 8a12 12 0 0 1 0 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
  findTargetNote: {
    label: 'Find the note',
    glyph: (
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r="11" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
        <circle cx="17" cy="7" r="3.2" fill="currentColor" opacity="0.3" />
        <circle cx="25.5" cy="21" r="3.2" fill="currentColor" />
      </svg>
    ),
  },
  findTargetPosition: {
    label: 'Find on the neck',
    glyph: (
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        {[7, 14, 21].map((y) => (
          <line key={y} x1="4" y1={y} x2="30" y2={y} stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
        ))}
        {[10, 18, 26].map((x) => (
          <line key={x} x1={x} y1="5" x2={x} y2="23" stroke="currentColor" strokeWidth="1" opacity="0.25" />
        ))}
        <circle cx="18" cy="14" r="3.6" fill="currentColor" />
      </svg>
    ),
  },
};

export default function IntervalSelectorPanel({
  instrument,
  masteredSizes,
  accidental,
  order,
  notation,
  trackedCount,
  busy,
  silentMode,
  onStart,
}: Props) {
  const { t, lang } = useTranslation();
  const sel = useIntervalSelector({
    instrument, masteredSizes, accidental, order, notation, audioMuted: silentMode,
  });
  const { state, pool } = sel;

  // The app-wide interaction feedback: a plain tap plays `click()`; a genuine
  // on/off toggle plays the directional toggle sound like the strings pills.
  const click = (fn: () => void) => () => {
    playClickSound();
    haptic.tap();
    fn();
  };
  const toggleClick = (isOn: boolean, fn: () => void) => () => {
    if (isOn) playToggleOffSound();
    else playToggleOnSound();
    haptic.tap();
    fn();
  };

  // Plain-language "Practising: …" line — the interval shorts in the pool.
  const poolShorts = pool
    .map((s) => intervalBySemitones(s)?.short ?? `+${s}`)
    .join(', ');
  const summary =
    (state.exercise === 'identifyInterval'
      ? t("You'll hear two notes. Pick the interval between them.")
      : state.exercise === 'findTargetPosition'
        ? t('A note is marked on the neck — tap the note that completes the interval.')
        : t("You'll see a note and an interval. Pick the note that far above it.")) +
    // At least one interval is always selected, but stay defensive: no dangling
    // "Practising: ." if the pool is somehow empty.
    (poolShorts ? ` ${t('Practising:')} ${poolShorts}.` : '');

  const singleQuality = state.selectedSizes.length <= 1;

  return (
    <div
      className="selector-panel interval-selector"
      dir={lang === 'he' ? 'rtl' : undefined}
      aria-label={t('Interval training')}
    >
      <p className="teacher-card-summary interval-selector-summary">
        {summary}
        {trackedCount > 0 && (
          <>
            {' — '}
            {trackedCount === 1
              ? t('1 interval tracked')
              : `${trackedCount} ${t('intervals tracked')}`}
          </>
        )}
      </p>

      {/* ── Intervals (§5.2) — the strings-selector pills: tap to light one,
          Multi to light several ─────────────────────────────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Intervals')}</span>
        <div className="selector-strings" role="group" aria-label={t('Intervals')}>
          {INTERVALS.map((iv) => {
            const selected = state.selectedSizes.includes(iv.semitones);
            return (
              <button
                key={iv.semitones}
                type="button"
                className={`string-pill ${selected ? 'active' : ''}`}
                aria-pressed={selected}
                disabled={busy}
                onClick={toggleClick(selected, () => sel.selectSize(iv.semitones))}
              >
                {iv.short}
              </button>
            );
          })}
          {/* "Multi" is an on/off mode switch, not a 12th interval — the dashed
              `.string-pill-toggle` is exactly the strings selector's Multi. */}
          <button
            type="button"
            className={`string-pill string-pill-toggle ${state.multiMode ? 'active' : ''}`}
            aria-pressed={state.multiMode}
            disabled={busy}
            onClick={toggleClick(state.multiMode, () => sel.toggleMulti())}
          >
            {t('Multi')}
          </button>
        </div>

        {/* Always rendered so toggling between one and many qualities does not
            shift the panel; a `min-height` reserves the collapsed `<summary>`. */}
        <div className="interval-about-slot">
          {state.selectedSizes.length === 1 && (() => {
            // "About this interval" — the §7 educational copy for the lone
            // quality in play, inline and collapsible (never a theory screen).
            const only = state.selectedSizes[0];
            const def = intervalBySemitones(only);
            const content = intervalContentBySemitones(only);
            if (!def || !content) return null;
            return (
              <details className="interval-about">
                <summary onClick={() => { playClickSound(); haptic.tap(); }}>
                  {t('About this interval')}
                </summary>
                <p className="interval-about-line">
                  <strong>{t(def.nameKey)}</strong> · {only} {t('semitones')}
                </p>
                <p className="interval-about-line">{t(content.description)}</p>
                <p className="interval-about-line">{t(content.comparison)}</p>
                <p className="interval-about-line interval-about-role">{t(content.role)}</p>
              </details>
            );
          })()}
        </div>
      </div>

      {/* ── Direction (§5.3) — two on/off tiles, at least one lit, like the
          neck half-picker ──────────────────────────────────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Direction')}</span>
        <div
          className="difficulty-road interval-direction-road"
          role="group"
          aria-label={t('Direction')}
        >
          <button
            type="button"
            className={`diff-btn ${state.dirUp ? 'active' : ''}`}
            aria-pressed={state.dirUp}
            disabled={busy}
            onClick={toggleClick(state.dirUp, () => sel.toggleDirection('up'))}
          >
            <span className="diff-icon">↑</span>
            <span className="diff-label">{t('Ascending')}</span>
          </button>
          <button
            type="button"
            className={`diff-btn ${state.dirDown ? 'active' : ''}`}
            aria-pressed={state.dirDown}
            disabled={busy}
            onClick={toggleClick(state.dirDown, () => sel.toggleDirection('down'))}
          >
            <span className="diff-icon">↓</span>
            <span className="diff-label">{t('Descending')}</span>
          </button>
        </div>
      </div>

      {/* ── Exercise (§5.1) — the `.mode-card` squares ──────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Exercise')}</span>
        <div
          className="mode-cards interval-exercise-cards"
          role="group"
          aria-label={t('Exercise')}
        >
          {EXERCISE_ORDER.map((ex) => {
            const active = state.exercise === ex;
            // Audio-only exercise: unavailable while drill sound is muted.
            const disabled = busy || (ex === 'identifyInterval' && !!silentMode);
            return (
              <button
                key={ex}
                type="button"
                className={`mode-card ${active ? 'active' : ''}`}
                aria-pressed={active}
                disabled={disabled}
                title={
                  ex === 'identifyInterval' && silentMode
                    ? t('Silent mode is on — this exercise needs sound.')
                    : undefined
                }
                onClick={click(() => sel.setExercise(ex))}
              >
                {EXERCISE_META[ex].glyph}
                <span>{t(EXERCISE_META[ex].label)}</span>
              </button>
            );
          })}
        </div>
        {silentMode && (
          <p className="interval-selector-hint">
            {t('Silent mode is on — “Identify the interval” needs sound.')}
          </p>
        )}
      </div>

      {/* ── Difficulty (§5.4 / §9.2) — the focused → mixed → full road ─ */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Difficulty')}</span>
        <div className="difficulty-road" role="group" aria-label={t('Difficulty')}>
          {DIFFICULTY_ORDER.map((d, i) => {
            // A lone quality cannot be "mixed" / "full" — pinned to focused.
            const locked = singleQuality && d !== 'focused';
            return (
              <Fragment key={d}>
                {i > 0 && <span className="diff-arrow">→</span>}
                <button
                  type="button"
                  className={`diff-btn ${state.difficulty === d ? 'active' : ''}${locked ? ' diff-btn-locked' : ''}`}
                  disabled={busy || locked}
                  title={locked ? t('Pick more than one interval to mix') : undefined}
                  onClick={click(() => sel.setDifficulty(d))}
                >
                  <span className="diff-icon">{DIFFICULTY_ICONS[d]}</span>
                  <span className="diff-label">{t(DIFFICULTY_LABELS[d])}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="teacher-actions">
        <button
          type="button"
          className="teacher-btn teacher-btn-primary"
          disabled={busy || pool.length === 0}
          onClick={click(() => onStart(sel.buildDrill()))}
        >
          ▶ {t('Start interval practice')}
        </button>
      </div>
    </div>
  );
}
