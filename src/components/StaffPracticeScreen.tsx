// ── StaffPracticeScreen — the "Staff reading" second home screen ─────────
//
// staff-reading-spec.md. One of the Learn drawer's domains, styled like
// ScalePracticeScreen (a second home screen, no Back row — the hamburger
// drawer is the only way off). Premium-only: the host mounts it behind
// `can('staffReading', tier)` and it is wrapped in <ProGate> as a second line
// of defence.
//
// Self-contained like Scales: it runs its own engine (`useStaffEngine`) and
// owns its start / running / summary states. Every answer folds into the
// staff lane of the learning state (`staffSrs` / `staffHistory`), which in
// turn steers which notes the next questions pick.
//
// Slice 1 (spec §11): two exercises (name the note / find it on the neck),
// three fret ranges, naturals or all twelve notes. The written spelling of a
// black key follows the app-wide sharps/flats setting, and chip labels follow
// the notation setting (A-B-C / Do-Re-Mi) like everywhere else.

import { useCallback, useMemo, useState } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import { useStaffEngine, type StaffAnswer, type StaffExercise } from '../hooks/useStaffEngine';
import {
  buildStaffPool, staffNameOptions, staffTopFret, STAFF_RANGES, type StaffRange,
} from '../learning/staffDrill';
import { staffSpecFor, spellPitch, staffPosition } from '../utils/staff';
import {
  loadLearningState, saveLearningStateLocal, getInstrumentState, withInstrumentState, recordStaffAnswer,
} from '../learning/learningState';
import StaffNotation from './StaffNotation';
import StaffNeckBoard from './StaffNeckBoard';
import IntervalChoiceRow from './IntervalChoiceRow';
import { ProGate } from './ProGate';
import { useTranslation } from '../i18n/useTranslation';
import { displayNote, type AccidentalMode, type NotationMode } from '../utils/music';
import { loadSetting, saveSetting } from '../utils/settings';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  instrument: InstrumentConfig;
  accidental: AccidentalMode;
  notation: NotationMode;
  /** Whether the hamburger button is shown — hidden while the drawer is open. */
  showMenuButton?: boolean;
  /** Open the hamburger drawer (the host owns the drawer state + nav). */
  onOpenMenu: () => void;
}

const EXERCISES: readonly StaffExercise[] = ['nameNote', 'findOnNeck'];
const QUESTION_COUNT = 12;
const TIME_LIMIT: Record<StaffExercise, number> = { nameNote: 10, findOnNeck: 15 };

// English literal = i18n key (app convention).
const EXERCISE_LABEL: Record<StaffExercise, string> = {
  nameNote: 'Name the note',
  findOnNeck: 'Find it on the neck',
};
const EXERCISE_HELP: Record<StaffExercise, string> = {
  nameNote: 'A note is written on the staff. Pick its name — you will hear it after you answer.',
  findOnNeck: 'A note is written on the staff. Tap a place on the neck that plays it — any string counts. Afterwards every place that plays it is shown.',
};
const RANGE_LABEL: Record<StaffRange, string> = {
  open: 'Frets 0–3',
  low: 'Frets 0–5',
  twelve: 'Frets 0–12',
};

function loadOneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = loadSetting<string>(key, fallback);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export default function StaffPracticeScreen({ instrument, accidental, notation, showMenuButton = true, onOpenMenu }: Props) {
  const { t, lang } = useTranslation();
  const [finished, setFinished] = useState(false);
  const [exercise, setExerciseState] = useState<StaffExercise>(() => loadOneOf('staff_exercise', EXERCISES, 'nameNote'));
  const [range, setRangeState] = useState<StaffRange>(() => loadOneOf('staff_range', STAFF_RANGES, 'open'));
  const [naturalsOnly, setNaturalsOnlyState] = useState<boolean>(() => loadSetting<boolean>('staff_naturalsOnly', true) !== false);

  const spec = staffSpecFor(instrument.id);
  const topFret = staffTopFret(range, instrument.maxFret);

  const pool = useMemo(
    () => buildStaffPool(
      { openMidi: instrument.openMidi, maxFret: instrument.maxFret, minFrets: instrument.minFrets },
      range,
      naturalsOnly,
    ),
    [instrument.openMidi, instrument.maxFret, instrument.minFrets, range, naturalsOnly],
  );

  const getSrs = useCallback(() => {
    const now = Date.now();
    return getInstrumentState(loadLearningState(now), instrument.id, now).staffSrs;
  }, [instrument.id]);

  const recordAnswer = useCallback((a: StaffAnswer) => {
    const now = Date.now();
    const state = loadLearningState(now);
    const inst = getInstrumentState(state, instrument.id, now);
    const next = recordStaffAnswer(inst, a.itemId, a.form, a.correct, a.seconds, now);
    saveLearningStateLocal(withInstrumentState(state, instrument.id, next));
  }, [instrument.id]);

  const engine = useStaffEngine({
    exercise,
    pool,
    openMidi: instrument.openMidi,
    questionCount: QUESTION_COUNT,
    timeLimit: TIME_LIMIT[exercise],
    getSrs,
    onComplete: () => setFinished(true),
    onAnswer: recordAnswer,
  });
  const { running, question } = engine;

  const pick = (fn: () => void) => {
    if (running) return;
    playClickSound(); haptic.tap();
    fn();
    setFinished(false);
  };
  const setExercise = (e: StaffExercise) => pick(() => { setExerciseState(e); saveSetting('staff_exercise', e); });
  const setRange = (r: StaffRange) => pick(() => { setRangeState(r); saveSetting('staff_range', r); });
  const setNaturalsOnly = (v: boolean) => pick(() => { setNaturalsOnlyState(v); saveSetting('staff_naturalsOnly', v); });

  const startSession = () => {
    playClickSound(); haptic.tap();
    setFinished(false);
    engine.start();
  };

  const clefHelp = spec.clef === 'bass'
    ? t('Bass music is written in the bass clef, one octave above how it sounds.')
    : spec.octaveMark
      ? t('Music for this instrument is written in the treble clef, one octave above how it sounds — the small 8 under the clef says so.')
      : t('Music for this instrument is written in the treble clef, at the pitch it sounds.');

  const written = question ? spellPitch(question.midi + spec.writtenShift, accidental) : null;
  const staffState: 'live' | 'correct' | 'wrong' = !engine.answered
    ? 'live'
    : (exercise === 'nameNote' ? engine.selected === engine.answerName : engine.tapped?.correct === true)
      ? 'correct'
      : 'wrong';

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
        <h1 className="interval-home-title">📖 {t('Staff reading')}</h1>

        <div className="settings-page-body">
          <ProGate
            feature="staffReading"
            variant="replace"
            pitch={t('Practise reading notes on the staff and finding them on the neck')}
          >
            {!running && (
              <div className="set-card scale-exercise-switcher" role="group" aria-label={t('Exercise')}>
                {EXERCISES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`set-card-btn${exercise === e ? ' set-card-btn-primary' : ''}`}
                    onClick={() => setExercise(e)}
                  >
                    {t(EXERCISE_LABEL[e])}
                  </button>
                ))}
              </div>
            )}

            {!running && (
              <div className="set-card scale-position-switcher" role="group" aria-label={t('Range')}>
                <span className="set-card-label">{t('Range')}</span>
                <div className="scale-position-row">
                  {STAFF_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`set-card-btn${range === r ? ' set-card-btn-primary' : ''}`}
                      onClick={() => setRange(r)}
                    >
                      {t(RANGE_LABEL[r])}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!running && (
              <div className="set-card scale-difficulty-switcher" role="group" aria-label={t('Notes')}>
                <span className="set-card-label">{t('Notes')}</span>
                <div className="scale-difficulty-row">
                  <button
                    type="button"
                    className={`set-card-btn${naturalsOnly ? ' set-card-btn-primary' : ''}`}
                    onClick={() => setNaturalsOnly(true)}
                  >
                    {t('Natural notes only')}
                  </button>
                  <button
                    type="button"
                    className={`set-card-btn${!naturalsOnly ? ' set-card-btn-primary' : ''}`}
                    onClick={() => setNaturalsOnly(false)}
                  >
                    {t('With sharps and flats')}
                  </button>
                </div>
              </div>
            )}

            {!running && !finished && (
              <div className="set-card">
                <p className="set-card-help">{t(EXERCISE_HELP[exercise])}</p>
                <p className="set-card-help">{clefHelp}</p>
                <button type="button" className="set-card-btn set-card-btn-primary" onClick={startSession}>
                  {t('Start')}
                </button>
              </div>
            )}

            {running && question && written && (
              <div className="set-card staff-card">
                <p className="set-card-help">
                  {t('Question')} {engine.questionNumber} / {engine.questionCount}
                  {' · '}{t('Score')}: {engine.session.score}
                </p>
                <StaffNotation
                  clef={spec.clef}
                  octaveMark={spec.octaveMark}
                  position={staffPosition(question.midi + spec.writtenShift, spec.clef, accidental)}
                  accidental={written.accidental}
                  state={staffState}
                  label={t('A note on the staff')}
                />
                {/* Always rendered, so the answer appearing never shifts the board. */}
                <p className="staff-answer" aria-live="polite">
                  {engine.answered && (
                    <>
                      {staffState === 'correct' ? '✓ ' : '✗ '}
                      {displayNote(engine.answerName ?? '', accidental, notation)}
                    </>
                  )}
                </p>

                {exercise === 'nameNote' && (
                  <IntervalChoiceRow
                    variant="note"
                    options={staffNameOptions(naturalsOnly).map((n) => ({
                      value: n,
                      label: displayNote(n, accidental, notation),
                    }))}
                    onSelect={engine.selectName}
                    correct={engine.answered ? engine.answerName : null}
                    wrong={engine.selected != null && engine.selected !== engine.answerName ? engine.selected : null}
                    disabled={engine.answered}
                    dir={lang === 'he' ? 'rtl' : undefined}
                  />
                )}

                {exercise === 'findOnNeck' && (
                  <StaffNeckBoard
                    topFret={topFret}
                    noteTable={instrument.notes}
                    stringCount={instrument.stringCount}
                    minFrets={instrument.minFrets}
                    reveal={engine.answered ? question.positions : null}
                    tapped={engine.tapped}
                    accidental={accidental}
                    notation={notation}
                    onTap={engine.tapPosition}
                  />
                )}

                <button
                  type="button"
                  className="set-card-btn"
                  onClick={() => { playClickSound(); haptic.tap(); engine.stop(); }}
                >
                  {t('Stop')}
                </button>
              </div>
            )}

            {!running && finished && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Session complete!')} {t('Score')}: {engine.session.score}
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
