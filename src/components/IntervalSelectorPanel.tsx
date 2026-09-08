// ── IntervalSelectorPanel — the Interval Selector UI ───────────────────
//
// The body of the "Intervals" learning page (intervals-learning-spec §5, task
// T6). Reads as the same *kind* of surface as the Notes `SelectorPanel`: a
// short set of grouped controls, a plain-language "?" summary, then Start →
// the shared countdown / drill / feedback. Every control here changes what is
// drilled or how hard it is (§5).
//
// Interval picking mirrors the Practice strings selector: a row of the 11
// interval chips plus a "Multi" toggle (off ⇒ pick one, on ⇒ pick several).
// It reuses the Premium Teacher card vocabulary (`.teacher-card`,
// `.teacher-btn`, `.interval-form-toggle`), so no new design system is
// introduced. All copy through `t()`; the layout flips for Hebrew via `dir`.
// Deliberately no Auto Advance toggle (§5.5).

import type { InstrumentConfig } from '../utils/instruments';
import type { AccidentalMode, OrderMode } from '../utils/music';
import type { DrillConfig } from '../drill/DrillConfig';
import { INTERVALS, intervalBySemitones } from '../utils/intervals';
import { intervalContentBySemitones } from '../learning/intervalContent';
import {
  useIntervalSelector,
  type IntervalDifficulty,
  type IntervalDirection,
} from '../hooks/useIntervalSelector';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  instrument: InstrumentConfig;
  /** Semitone sizes currently mastered — seeds the first-run selection (§5.2). */
  masteredSizes: number[];
  accidental: AccidentalMode;
  order: OrderMode;
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

const DIRECTION_LABELS: Record<IntervalDirection, string> = {
  up: 'Ascending',
  down: 'Descending',
  both: 'Both',
};

export default function IntervalSelectorPanel({
  instrument,
  masteredSizes,
  accidental,
  order,
  trackedCount,
  busy,
  silentMode,
  onStart,
}: Props) {
  const { t, lang } = useTranslation();
  const sel = useIntervalSelector({
    instrument, masteredSizes, accidental, order, audioMuted: silentMode,
  });
  const { state, pool } = sel;

  // A small helper so every control fires the click sound + haptic tap, per
  // the app-wide `click()` convention.
  const click = (fn: () => void) => () => {
    playClickSound();
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

  const segButton = (
    active: boolean,
    label: string,
    onClick: () => void,
    disabled?: boolean,
    title?: string,
  ) => (
    <button
      key={label}
      type="button"
      className={`teacher-btn${active ? ' teacher-btn-primary' : ''}`}
      aria-pressed={active}
      disabled={busy || disabled}
      title={title}
      onClick={click(onClick)}
    >
      {t(label)}
    </button>
  );

  return (
    <section
      className="teacher-card interval-selector"
      dir={lang === 'he' ? 'rtl' : undefined}
      aria-label={t('Interval training')}
    >
      <p className="teacher-card-summary">
        {summary}
        {trackedCount > 0 && (
          <>
            {' — '}
            {trackedCount} {t('intervals tracked')}
          </>
        )}
      </p>

      {/* ── Exercise (§5.1) ─────────────────────────────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Exercise')}</span>
        <div className="interval-form-toggle" role="group" aria-label={t('Exercise')}>
          {segButton(
            state.exercise === 'identifyInterval',
            'Identify the interval',
            () => sel.setExercise('identifyInterval'),
            // Audio-only exercise: unavailable while drill sound is muted.
            silentMode,
            silentMode ? t('Silent mode is on — this exercise needs sound.') : undefined,
          )}
          {segButton(
            state.exercise === 'findTargetNote',
            'Find the note',
            () => sel.setExercise('findTargetNote'),
          )}
          {segButton(
            state.exercise === 'findTargetPosition',
            'Find on the neck',
            () => sel.setExercise('findTargetPosition'),
          )}
        </div>
        {silentMode && (
          <p className="interval-selector-hint">
            {t('Silent mode is on — “Identify the interval” needs sound.')}
          </p>
        )}
      </div>

      {/* ── Intervals (§5.2) — like the strings selector: pick one, or
          Multi to pick several ─────────────────────────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Intervals')}</span>
        <div
          className="interval-form-toggle interval-selector-wrap"
          role="group"
          aria-label={t('Intervals')}
        >
          {INTERVALS.map((iv) =>
            segButton(
              state.selectedSizes.includes(iv.semitones),
              iv.short,
              () => sel.selectSize(iv.semitones),
            ),
          )}
          {/* "Multi" is an on/off mode switch, not a 12th interval — the dashed
              outline (and dashed-accent when on) matches the strings selector's
              `.string-pill-toggle` so it never reads as a selected chip. */}
          <button
            type="button"
            className={`teacher-btn interval-multi-toggle${state.multiMode ? ' is-on' : ''}`}
            aria-pressed={state.multiMode}
            disabled={busy}
            onClick={click(() => sel.toggleMulti())}
          >
            {t('Multi')}
          </button>
        </div>

        {state.selectedSizes.length === 1 && (() => {
          // "About this interval" — the §7 educational copy for the lone quality
          // in play, inline and collapsible (never a theory screen).
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

      {/* ── Difficulty (§5.4 / §9.2) ────────────────────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Difficulty')}</span>
        <div className="interval-form-toggle" role="group" aria-label={t('Difficulty')}>
          {(Object.keys(DIFFICULTY_LABELS) as IntervalDifficulty[]).map((d) =>
            segButton(
              state.difficulty === d,
              DIFFICULTY_LABELS[d],
              () => sel.setDifficulty(d),
              // A lone quality cannot be "mixed" / "full" — pinned to focused.
              state.selectedSizes.length <= 1 && d !== 'focused',
            ),
          )}
        </div>
      </div>

      {/* ── Direction (§5.3 — both in the MVP) ──────────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Direction')}</span>
        <div className="interval-form-toggle" role="group" aria-label={t('Direction')}>
          {(Object.keys(DIRECTION_LABELS) as IntervalDirection[]).map((d) =>
            segButton(state.direction === d, DIRECTION_LABELS[d], () => sel.setDirection(d)),
          )}
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
    </section>
  );
}
