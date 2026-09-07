// ── IntervalSelectorPanel — the Interval Selector UI ───────────────────
//
// The body of the "Intervals" learning page (intervals-learning-spec §5, task
// T6). Reads as the same *kind* of surface as the Notes `SelectorPanel`: a
// short set of grouped controls, a plain-language "?" summary, then Start →
// the shared countdown / drill / feedback. Every control here changes what is
// drilled or how hard it is (§5).
//
// It reuses the Premium Teacher card vocabulary (`.teacher-card`,
// `.teacher-btn`, `.interval-form-toggle`) and the interval answer-chip row,
// so no new design system is introduced. All copy through `t()`; the layout
// flips for Hebrew via `dir`. Deliberately no Auto Advance toggle (§5.5).

import type { InstrumentConfig } from '../utils/instruments';
import type { AccidentalMode, OrderMode } from '../utils/music';
import type { DrillConfig } from '../drill/DrillConfig';
import { INTERVALS, intervalBySemitones } from '../utils/intervals';
import { INTERVAL_CURRICULUM } from '../learning/intervalCurriculum';
import { intervalContentBySemitones } from '../learning/intervalContent';
import {
  useIntervalSelector,
  type IntervalSelection,
  type IntervalDifficulty,
  type IntervalDirection,
} from '../hooks/useIntervalSelector';
import IntervalChoiceRow from './IntervalChoiceRow';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  instrument: InstrumentConfig;
  /** Semitone sizes currently mastered — resolves "All learned" (§5.2). */
  masteredSizes: number[];
  accidental: AccidentalMode;
  order: OrderMode;
  /** Distinct interval qualities the SRS schedule is tracking so far. */
  trackedCount: number;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  onStart: (config: DrillConfig) => void;
}

const SELECTION_LABELS: Record<IntervalSelection, string> = {
  one: 'One interval',
  group: 'A group',
  allLearned: 'All learned',
  all11: 'All 11',
};

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
  onStart,
}: Props) {
  const { t, lang } = useTranslation();
  const sel = useIntervalSelector({ instrument, masteredSizes, accidental, order });
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
      : t("You'll see a note and an interval. Pick the note that far above it.")) +
    ` ${t('Practising:')} ${poolShorts}.`;

  const segButton = (
    active: boolean,
    label: string,
    onClick: () => void,
    disabled?: boolean,
  ) => (
    <button
      key={label}
      type="button"
      className={`teacher-btn${active ? ' teacher-btn-primary' : ''}`}
      aria-pressed={active}
      disabled={busy || disabled}
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
      <header className="teacher-card-head">
        <span className="teacher-card-badge">⭐ {t('Premium')}</span>
        <h2 className="teacher-card-title">{t('Interval training')}</h2>
      </header>

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
          )}
          {segButton(
            state.exercise === 'findTargetNote',
            'Find the note',
            () => sel.setExercise('findTargetNote'),
          )}
        </div>
      </div>

      {/* ── Interval selection (§5.2) ───────────────────────────── */}
      <div className="interval-selector-group">
        <span className="interval-selector-label">{t('Interval selection')}</span>
        <div
          className="interval-form-toggle interval-selector-wrap"
          role="group"
          aria-label={t('Interval selection')}
        >
          {(Object.keys(SELECTION_LABELS) as IntervalSelection[]).map((s) =>
            segButton(state.selection === s, SELECTION_LABELS[s], () => sel.setSelection(s)),
          )}
        </div>

        {state.selection === 'one' && (
          <>
            <IntervalChoiceRow
              variant="interval"
              options={INTERVALS.map((i) => ({ value: String(i.semitones), label: i.short }))}
              correct={String(state.single)}
              disabled={busy}
              dir={lang === 'he' ? 'rtl' : undefined}
              onSelect={(v) => sel.setSingle(Number(v))}
            />
            {(() => {
              // "About this interval" — the §7 educational copy for the single
              // quality in play, inline and collapsible (never a theory screen).
              const def = intervalBySemitones(state.single);
              const content = intervalContentBySemitones(state.single);
              if (!def || !content) return null;
              return (
                <details className="interval-about">
                  <summary onClick={() => { playClickSound(); haptic.tap(); }}>
                    {t('About this interval')}
                  </summary>
                  <p className="interval-about-line">
                    <strong>{t(def.nameKey)}</strong> · {state.single} {t('semitones')}
                  </p>
                  <p className="interval-about-line">{t(content.description)}</p>
                  <p className="interval-about-line">{t(content.comparison)}</p>
                  <p className="interval-about-line interval-about-role">{t(content.role)}</p>
                </details>
              );
            })()}
          </>
        )}

        {state.selection === 'group' && (
          <div
            className="interval-form-toggle interval-selector-wrap"
            role="group"
            aria-label={t('A group')}
          >
            {INTERVAL_CURRICULUM.filter((g) => g.id !== 'all').map((g) =>
              segButton(state.groupId === g.id, g.name, () => sel.setGroup(g.id)),
            )}
          </div>
        )}
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
              // A single quality cannot be "mixed" / "full" — pinned to focused.
              state.selection === 'one' && d !== 'focused',
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
          disabled={busy}
          onClick={click(() => onStart(sel.buildDrill()))}
        >
          ▶ {t('Start interval practice')}
        </button>
      </div>
    </section>
  );
}
