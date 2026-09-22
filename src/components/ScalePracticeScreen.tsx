// ── ScalePracticeScreen — the "Scales" second home screen ───────────────
//
// One of the learning-type tabs from the drawer's "Learn" group, styled like
// IntervalPracticeScreen (a second home screen, no Back row — the hamburger
// drawer is the only way off). Premium-only: the host mounts it behind
// `can('scaleDrill', tier)` and it is wrapped in <ProGate> as a second line
// of defence.
//
// Unlike Intervals, this screen does NOT hand a `DrillConfig` back to the
// host's shared `useGameEngine` — every exercise runs on its own dedicated
// engine (`useScaleTilesEngine` for Exercise A — a real-time Piano Tiles
// mechanic, see its header comment — `useScaleChipEngine` for B and C — see
// their header comments for why: the shared engine's byNote flow can't
// answer a multi-string, multi-note-name shape, and Scales is already a
// sibling domain with its own everything, scales-learning-spec.md §0). So
// this screen owns its own start/running/summary states instead of
// delegating the run back up.
//
// Slice 1 (scales-learning-spec.md §4.2): Minor Pentatonic only. Picks
// (exercise/position/difficulty) + persistence + the derived pool/envelope
// come from `useScaleSelector` (§5.1/§5.3/§5.4); §5.2 "scale selection" is
// deliberately not built yet — see that hook's header comment for why it's
// meaningless while only one scale type is shipped. This screen still only
// renders a minimal segmented-button UI for each control, not the richer
// `IntervalSelectorPanel`-style layout Intervals uses — good enough while
// there's one scale type and two positions.

import { useCallback, useMemo, useState } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import { useScaleTilesEngine, type ScaleTilesAnswer } from '../hooks/useScaleTilesEngine';
import { useScaleChipEngine, type ScaleChipAnswer } from '../hooks/useScaleChipEngine';
import { useScaleSelector, type ScaleDifficulty } from '../hooks/useScaleSelector';
import { scaleTypeById, SCALE_TYPES } from '../utils/scales';
import { scaleItemId } from '../learning/scaleItem';
import { buildScalePool } from '../learning/scaleDrill';
import { buildScaleBoard } from '../learning/scaleMastery';
import { loadLearningState, saveLearningStateLocal, getInstrumentState, withInstrumentState, recordScaleAnswer } from '../learning/learningState';
import ScaleTilesBoard from './ScaleTilesBoard';
import ScaleProgressBoard from './ScaleProgressBoard';
import IntervalChoiceRow from './IntervalChoiceRow';
import { ProGate } from './ProGate';
import { useTranslation } from '../i18n/useTranslation';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';
import { playClickSound, haptic } from '../utils/feedback';

// Exercise A's "tempo" (ms between consecutive tile arrivals) isn't part of
// `ScaleEnvelope` — that field only applies to the chip exercises' per-
// question countdown (`useScaleSelector.ts`'s header comment) — so it's
// derived from `difficulty` locally here instead, same three-tier shape.
const BEAT_MS_BY_DIFFICULTY: Record<ScaleDifficulty, number> = {
  focused: 1100,
  mixed: 900,
  full: 700,
};

interface Props {
  instrument: InstrumentConfig;
  accidental: AccidentalMode;
  notation: NotationMode;
  /** Whether the hamburger button is shown — hidden while the drawer is
   *  already open, matching IntervalPracticeScreen. */
  showMenuButton?: boolean;
  /** Open the hamburger drawer (the host owns the drawer state + nav). */
  onOpenMenu: () => void;
}

export default function ScalePracticeScreen({ instrument, accidental, notation, showMenuButton = true, onOpenMenu }: Props) {
  const { t, lang } = useTranslation();
  const [finished, setFinished] = useState(false);
  const [tab, setTab] = useState<'practice' | 'progress'>('practice');
  // Bumped on every recorded answer (mirrors `useLearning.ts`'s own `now`
  // state) so the Progress tab's board (read fresh from localStorage below)
  // reflects the just-finished question instead of staying frozen at
  // whatever it showed when this screen mounted — and so the board is
  // derived from state rather than calling `Date.now()` during render.
  const [now, setNow] = useState(() => Date.now());

  const sel = useScaleSelector(instrument.stringCount);
  const { exercise, pool } = sel;

  const chipInstrument = useMemo(
    () => ({ notes: instrument.notes, stringCount: instrument.stringCount, maxFret: instrument.maxFret }),
    [instrument.notes, instrument.stringCount, instrument.maxFret],
  );

  const buildEnvelope = sel.buildEnvelope(false);
  const chipEnvelope = sel.buildEnvelope(true);

  // Feed every scale answer, from any of the three exercises, into the
  // per-item SRS schedule (scales-learning-spec.md §10) — local-only so far,
  // see `learningState.ts`'s `InstrumentLearningState` header note (§15's
  // cloud wiring is a later increment). Score used to be thrown away when
  // the screen closed (Session 2 plan step 3's own framing); it no longer is.
  const recordAnswer = useCallback(
    (itemId: string, form: 'buildScale' | 'identifyScale' | 'nameDegree', correct: boolean, seconds: number) => {
      const ts = Date.now();
      const state = loadLearningState(ts);
      const inst = getInstrumentState(state, instrument.id, ts);
      const next = recordScaleAnswer(inst, itemId, form, correct, seconds, ts);
      saveLearningStateLocal(withInstrumentState(state, instrument.id, next));
      setNow(ts);
    },
    [instrument.id],
  );

  // The progress board (§12) is built against the full shipped catalogue —
  // not the Selector's own `pool`, which may be narrowed to one position —
  // so it always shows every position of every scale type shipped so far,
  // regardless of what the learner currently has picked to practise.
  const boardRows = useMemo(() => {
    const state = loadLearningState(now);
    const inst = getInstrumentState(state, instrument.id, now);
    const fullPool = buildScalePool(SCALE_TYPES.map((s) => s.id), instrument.stringCount);
    return buildScaleBoard({
      pool: fullPool,
      scaleSrs: inst.scaleSrs,
      historyRows: inst.scaleHistory,
      now,
    });
  }, [instrument.id, instrument.stringCount, now]);

  const buildEngine = useScaleTilesEngine({
    instrument: chipInstrument,
    pool,
    questionCount: buildEnvelope.questionCount,
    beatMs: BEAT_MS_BY_DIFFICULTY[sel.difficulty],
    naturalsOnly: buildEnvelope.naturalsOnlyRoot,
    onComplete: () => setFinished(true),
    onAnswer: (a: ScaleTilesAnswer) =>
      recordAnswer(scaleItemId(a.scaleTypeId, a.positionIndex), 'buildScale', a.correct, a.seconds),
  });

  const chipEngine = useScaleChipEngine({
    exercise: exercise === 'buildScale' ? 'identifyScale' : exercise,
    instrument: chipInstrument,
    pool,
    questionCount: chipEnvelope.questionCount,
    timeLimit: chipEnvelope.timeLimit,
    optionCount: chipEnvelope.optionCount,
    naturalsOnly: chipEnvelope.naturalsOnlyRoot,
    onComplete: () => setFinished(true),
    onAnswer: (a: ScaleChipAnswer) =>
      recordAnswer(scaleItemId(a.scaleTypeId, a.positionIndex), a.form, a.correct, a.seconds),
  });

  const running = exercise === 'buildScale' ? buildEngine.running : chipEngine.running;

  const startSession = () => {
    playClickSound(); haptic.tap();
    setFinished(false);
    if (exercise === 'buildScale') buildEngine.start();
    else chipEngine.start();
  };

  const pickExercise = (next: typeof exercise) => {
    if (running) return;
    playClickSound(); haptic.tap();
    sel.setExercise(next);
    setFinished(false);
  };

  const score = exercise === 'buildScale' ? buildEngine.session.score : chipEngine.session.score;

  return (
    <div className="app settings-page lp-page interval-home">
      {showMenuButton && (
        <button
          className="burger-btn"
          onClick={() => { playClickSound(); haptic.tap(); onOpenMenu(); }}
          aria-label={t('Open settings')}
          title={t('Settings')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
      )}
      <div className="sp2 settings-page-inner" dir={lang === 'he' ? 'rtl' : undefined}>
        <h1 className="interval-home-title">🎼 {t('Scale training')}</h1>

        <div className="settings-page-body">
          <ProGate
            feature="scaleDrill"
            variant="replace"
            pitch={t('Practise building scale shapes on the neck')}
          >
            {!running && (
              <div className="stats-tabs" role="group">
                <button
                  type="button"
                  className={`stats-tab${tab === 'practice' ? ' stats-tab-active' : ''}`}
                  onClick={() => { playClickSound(); haptic.tap(); setTab('practice'); }}
                >
                  {t('Practice')}
                </button>
                <button
                  type="button"
                  className={`stats-tab${tab === 'progress' ? ' stats-tab-active' : ''}`}
                  onClick={() => { playClickSound(); haptic.tap(); setTab('progress'); setNow(Date.now()); }}
                >
                  {t('Progress')}
                </button>
              </div>
            )}

            {!running && tab === 'progress' && (
              <div className="set-card">
                <ScaleProgressBoard rows={boardRows} />
              </div>
            )}

            {!running && tab === 'practice' && (
              <div className="set-card scale-exercise-switcher" role="group">
                <button
                  type="button"
                  className={`set-card-btn${exercise === 'buildScale' ? ' set-card-btn-primary' : ''}`}
                  onClick={() => pickExercise('buildScale')}
                >
                  {t('Build the scale')}
                </button>
                <button
                  type="button"
                  className={`set-card-btn${exercise === 'identifyScale' ? ' set-card-btn-primary' : ''}`}
                  onClick={() => pickExercise('identifyScale')}
                >
                  {t('Identify the scale')}
                </button>
                <button
                  type="button"
                  className={`set-card-btn${exercise === 'nameDegree' ? ' set-card-btn-primary' : ''}`}
                  onClick={() => pickExercise('nameDegree')}
                >
                  {t('Name the degree')}
                </button>
              </div>
            )}

            {!running && tab === 'practice' && sel.positionChoiceAvailable && (
              <div className="set-card scale-position-switcher" role="group" aria-label={t('Position')}>
                <span className="set-card-label">{t('Position')}</span>
                <div className="scale-position-row">
                  <button
                    type="button"
                    className={`set-card-btn${sel.positionMode === 'all' ? ' set-card-btn-primary' : ''}`}
                    onClick={() => { playClickSound(); haptic.tap(); sel.setPositionMode('all'); }}
                  >
                    {t('All positions')}
                  </button>
                  {sel.availablePositions.map((p) => (
                    <button
                      key={p.positionIndex}
                      type="button"
                      className={`set-card-btn${sel.positionMode === 'one' && sel.positionIndex === p.positionIndex ? ' set-card-btn-primary' : ''}`}
                      onClick={() => {
                        playClickSound(); haptic.tap();
                        sel.setPositionIndex(p.positionIndex);
                        sel.setPositionMode('one');
                      }}
                    >
                      {t('Box')} {p.positionIndex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!running && tab === 'practice' && (
              <div className="set-card scale-difficulty-switcher" role="group" aria-label={t('Difficulty')}>
                <span className="set-card-label">{t('Difficulty')}</span>
                <div className="scale-difficulty-row">
                  {(['focused', 'mixed', 'full'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`set-card-btn${sel.difficultyStored === d ? ' set-card-btn-primary' : ''}`}
                      disabled={sel.positionMode === 'one'}
                      onClick={() => { playClickSound(); haptic.tap(); sel.setDifficulty(d); }}
                    >
                      {t(d === 'focused' ? 'Focused' : d === 'mixed' ? 'Mixed' : 'Full')}
                    </button>
                  ))}
                </div>
                {sel.positionMode === 'one' && (
                  <p className="set-card-help">
                    {t('One position selected — difficulty is focused.')}
                  </p>
                )}
              </div>
            )}

            {!running && tab === 'practice' && !finished && exercise === 'buildScale' && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Notes of the scale fall down their string\'s lane. Tap the lane the moment each one crosses the line.')}
                </p>
                <button type="button" className="set-card-btn set-card-btn-primary" onClick={startSession}>
                  {t('Start')}
                </button>
              </div>
            )}
            {!running && tab === 'practice' && !finished && exercise === 'identifyScale' && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('The app plays the scale ascending, root to top. Pick which scale you heard.')}
                </p>
                <button type="button" className="set-card-btn set-card-btn-primary" onClick={startSession}>
                  {t('Start')}
                </button>
              </div>
            )}
            {!running && tab === 'practice' && !finished && exercise === 'nameDegree' && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('The app shows a scale, a root and a degree. Pick the note that matches.')}
                </p>
                <button type="button" className="set-card-btn set-card-btn-primary" onClick={startSession}>
                  {t('Start')}
                </button>
              </div>
            )}

            {buildEngine.running && buildEngine.run && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Question')} {buildEngine.questionNumber} / {buildEngine.questionCount}
                  {' · '}{t('Found')} {buildEngine.hits} / {buildEngine.run.tiles.length}
                </p>
                <ScaleTilesBoard
                  run={buildEngine.run}
                  resolutions={buildEngine.resolutions}
                  stringCount={instrument.stringCount}
                  active={buildEngine.running}
                  onTapLane={buildEngine.tapLane}
                />
              </div>
            )}

            {chipEngine.running && chipEngine.question && exercise === 'identifyScale' && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Question')} {chipEngine.questionNumber} / {chipEngine.questionCount}
                </p>
                <button type="button" className="scale-replay-btn" onClick={chipEngine.replay}>
                  {t('🔊 hear it again')}
                </button>
                <IntervalChoiceRow
                  variant="scale"
                  options={chipEngine.question.options.map((id) => ({
                    value: id,
                    label: t(scaleTypeById(id)?.nameKey ?? id),
                  }))}
                  onSelect={chipEngine.selectOption}
                  correct={chipEngine.selected != null ? chipEngine.answerValue : null}
                  wrong={chipEngine.selected != null && chipEngine.selected !== chipEngine.answerValue ? chipEngine.selected : null}
                  disabled={chipEngine.selected != null}
                  dir={lang === 'he' ? 'rtl' : undefined}
                />
              </div>
            )}

            {chipEngine.running && chipEngine.question && exercise === 'nameDegree' && 'degreeLabel' in chipEngine.question && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Question')} {chipEngine.questionNumber} / {chipEngine.questionCount}
                </p>
                <p className="set-card-help">
                  {t('Degree')} {chipEngine.question.degreeLabel}
                  {' · '}{t('Root')} {displayNote(chipEngine.question.rootName, accidental, notation)}
                  {' · '}{t(scaleTypeById(chipEngine.question.scaleTypeId)?.nameKey ?? chipEngine.question.scaleTypeId)}
                </p>
                <IntervalChoiceRow
                  variant="note"
                  options={chipEngine.question.options.map((n) => ({
                    value: n,
                    label: displayNote(n, accidental, notation),
                  }))}
                  onSelect={chipEngine.selectOption}
                  correct={chipEngine.selected != null ? chipEngine.answerValue : null}
                  wrong={chipEngine.selected != null && chipEngine.selected !== chipEngine.answerValue ? chipEngine.selected : null}
                  disabled={chipEngine.selected != null}
                  dir={lang === 'he' ? 'rtl' : undefined}
                />
              </div>
            )}

            {!running && tab === 'practice' && finished && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Session complete!')} {t('Score')}: {score}
                </p>
                <button type="button" className="set-card-btn set-card-btn-primary" onClick={startSession}>
                  {t('Practice again')}
                </button>
              </div>
            )}
          </ProGate>
        </div>
      </div>
    </div>
  );
}
