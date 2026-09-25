// ── TabPracticeScreen — the "Tab reading" second home screen ─────────────
//
// tab-reading-spec.md. One of the Learn drawer's domains, styled like
// StaffPracticeScreen (a second home screen, no Back row — the hamburger
// drawer is the only way off). Premium-only: the host mounts it behind
// `can('tabReading', tier)` and it is wrapped in <ProGate> as a second line
// of defence.
//
// Self-contained like Staff reading: it runs the shared reading engine
// (`useReadingEngine`) and owns its start / running / summary states, plus a
// Progress tab. Every answer folds into the tab lane of the learning state
// (`tabSrs` / `tabHistory` / `tabDaily`), which steers which positions come
// next, and is pushed to the cloud like the rest of the learning blob.
//
// Four exercises (name the note / find it on the neck / write it in tab /
// read a riff), four fret ranges, and natural notes only or every note. Note
// names follow the app-wide sharps/flats and notation settings.
//
// The tab is drawn the way every real tab is — thinnest string on the top
// line — while the neck board keeps the app's lowest-string-on-top layout.
// The screen says so in one line, because that flip is exactly what a
// beginner gets wrong.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import { useReadingEngine, type ReadingAnswer, type ReadingQuestion } from '../hooks/useReadingEngine';
import {
  buildTabPool, buildTabRiff, pickTabQuestion, tabBottomFret, tabNameOptions, tabTopFret,
  TAB_RANGES, type TabPoolItem, type TabRange,
} from '../learning/tabDrill';
import { buildTabBoard } from '../learning/tabMastery';
import type { SrsMap } from '../learning/srs';
import { pitchClassName } from '../utils/staff';
import {
  loadLearningState, saveLearningStateLocal, getInstrumentState, withInstrumentState, recordTabAnswer,
  rollDailyGoal, type TabForm,
} from '../learning/learningState';
import { cloudPushLearning } from '../learning/learningSync';
import TabNotation, { type TabNote } from './TabNotation';
import StaffNeckBoard from './StaffNeckBoard';
import TabProgressBoard from './TabProgressBoard';
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

type TabExercise = TabForm;
type TabQuestion = ReadingQuestion<TabPoolItem>;

const EXERCISES: readonly TabExercise[] = ['nameNote', 'findOnNeck', 'writeTab', 'readRiff'];
const QUESTION_COUNT: Record<TabExercise, number> = { nameNote: 12, findOnNeck: 12, writeTab: 12, readRiff: 6 };
const NOTES_PER_QUESTION: Record<TabExercise, number> = { nameNote: 1, findOnNeck: 1, writeTab: 1, readRiff: 5 };
/** Seconds per note. */
const TIME_LIMIT: Record<TabExercise, number> = { nameNote: 10, findOnNeck: 12, writeTab: 20, readRiff: 8 };

// English literal = i18n key (app convention).
const EXERCISE_LABEL: Record<TabExercise, string> = {
  nameNote: 'Name the note',
  findOnNeck: 'Find it on the neck',
  writeTab: 'Write it in tab',
  readRiff: 'Read a riff',
};
const EXERCISE_HELP: Record<TabExercise, string> = {
  nameNote: 'A number is written on one line of the tab. Name the note it plays — you will hear it after you answer.',
  findOnNeck: 'A number is written on one line of the tab. Tap that exact place on the neck: the line is the string, the number is the fret.',
  writeTab: 'A place on the neck is marked. Tap the tab line of its string, pick the fret number, then press Check.',
  readRiff: 'A short riff is written in the tab. Name its notes one after another — at the end you will hear it.',
};
const FIXED_RANGE_LABEL: Record<Exclude<TabRange, 'high'>, string> = {
  open: 'Frets 0–3',
  low: 'Frets 0–5',
  twelve: 'Frets 0–12',
};

function loadOneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = loadSetting<string>(key, fallback);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

interface Written { string: number | null; fret: number | null }

export default function TabPracticeScreen({ instrument, accidental, notation, showMenuButton = true, onOpenMenu }: Props) {
  const { t, lang } = useTranslation();
  const [finished, setFinished] = useState(false);
  const [tab, setTab] = useState<'practice' | 'progress'>('practice');
  const [exercise, setExerciseState] = useState<TabExercise>(() => loadOneOf('tab_exercise', EXERCISES, 'nameNote'));
  const [range, setRangeState] = useState<TabRange>(() => loadOneOf('tab_range', TAB_RANGES, 'open'));
  const [naturalsOnly, setNaturalsOnlyState] = useState<boolean>(() => loadSetting<boolean>('tab_naturalsOnly', true) !== false);
  // What the learner has written so far ("Write it in tab"), tagged with the
  // question it belongs to so a new question starts with a clean tab.
  const [written, setWritten] = useState<{ q: TabQuestion; w: Written } | null>(null);
  // Bumped on every recorded answer and on a cloud reconcile, so the daily
  // goal and the Progress board re-read the learning state.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const reread = () => setNow(Date.now());
    window.addEventListener('learning-synced', reread);
    return () => window.removeEventListener('learning-synced', reread);
  }, []);

  const topFret = tabTopFret(range, instrument.maxFret);
  const bottomFret = tabBottomFret(range, instrument.maxFret);

  const pool = useMemo(
    () => buildTabPool(
      { openMidi: instrument.openMidi, maxFret: instrument.maxFret, minFrets: instrument.minFrets },
      range,
      naturalsOnly,
    ),
    [instrument.openMidi, instrument.maxFret, instrument.minFrets, range, naturalsOnly],
  );

  const instState = useMemo(
    () => getInstrumentState(loadLearningState(now), instrument.id, now),
    [instrument.id, now],
  );
  const dailyGoal = rollDailyGoal(instState.tabDaily, now, instState.tabDaily.target);
  const boardItems = useMemo(
    () => buildTabBoard(pool, instState.tabSrs, instState.tabHistory, now),
    [pool, instState, now],
  );

  const getSrs = useCallback(() => {
    const ts = Date.now();
    return getInstrumentState(loadLearningState(ts), instrument.id, ts).tabSrs;
  }, [instrument.id]);

  const recordAnswer = useCallback((a: ReadingAnswer<TabExercise>) => {
    const ts = Date.now();
    const state = loadLearningState(ts);
    const inst = getInstrumentState(state, instrument.id, ts);
    const next = recordTabAnswer(inst, a.itemId, a.form, a.correct, a.seconds, ts);
    saveLearningStateLocal(withInstrumentState(state, instrument.id, next));
    // A no-op for a guest / offline; the reconcile merges per item.
    cloudPushLearning();
    setNow(ts);
  }, [instrument.id]);

  const notesPerQuestion = NOTES_PER_QUESTION[exercise];
  const pickItems = useCallback((srs: SrsMap, previous: TabPoolItem | null, ts: number) => {
    const previousId = previous?.itemId ?? null;
    return notesPerQuestion > 1
      ? buildTabRiff(pool, srs, notesPerQuestion, previousId, ts)
      : [pickTabQuestion(pool, srs, previousId, ts)].filter((q): q is TabPoolItem => q != null);
  }, [pool, notesPerQuestion]);

  const engine = useReadingEngine({
    exercise,
    pickItems,
    openMidi: instrument.openMidi,
    questionCount: QUESTION_COUNT[exercise],
    notesPerQuestion,
    timeLimit: TIME_LIMIT[exercise],
    markPosition: exercise === 'writeTab',
    exactPosition: true,
    getSrs,
    onComplete: () => setFinished(true),
    onAnswer: recordAnswer,
  });
  const { running, question, cursor, results, answered } = engine;

  const current: Written = written && written.q === question ? written.w : { string: null, fret: null };
  const write = (patch: Partial<Written>) => {
    if (!question || answered) return;
    setWritten({ q: question, w: { ...current, ...patch } });
  };

  const pick = (fn: () => void) => {
    if (running) return;
    playClickSound(); haptic.tap();
    fn();
    setFinished(false);
  };
  const setExercise = (e: TabExercise) => pick(() => { setExerciseState(e); saveSetting('tab_exercise', e); });
  const setRange = (r: TabRange) => pick(() => { setRangeState(r); saveSetting('tab_range', r); });
  const setNaturalsOnly = (v: boolean) => pick(() => { setNaturalsOnlyState(v); saveSetting('tab_naturalsOnly', v); });

  const startSession = () => {
    playClickSound(); haptic.tap();
    setFinished(false);
    engine.start();
  };

  const nameOf = (midi: number) => displayNote(pitchClassName(midi), accidental, notation);
  const stringNames = Array.from(
    { length: instrument.stringCount },
    (_, i) => displayNote(instrument.notes[i]?.[0] ?? '', accidental, notation),
  );
  // Real tabs write the top string in lower case when it shares its name
  // with the bottom one (e … E), so the two lines never read alike.
  if (stringNames.length > 1 && stringNames[0] === stringNames[stringNames.length - 1]) {
    stringNames[0] = stringNames[0].toLowerCase();
  }
  const rangeLabel = (r: TabRange) => r === 'high'
    // Isolated LTR, so "12–21" never reads backwards on a Hebrew page.
    ? `${t('Frets')} ⁦${tabBottomFret('high', instrument.maxFret)}–${instrument.maxFret}⁩`
    : t(FIXED_RANGE_LABEL[r]);

  // ── The tab for the current question ────────────────────────────────
  const items = question?.items ?? [];
  const single = items.length === 1;
  const singleCorrect = single && results[0]?.correct === true;

  let tabNotes: TabNote[] = [];
  if (exercise === 'writeTab') {
    if (current.string != null) {
      tabNotes.push({ string: current.string, fret: current.fret, state: !answered ? 'ghost' : singleCorrect ? 'correct' : 'wrong' });
    }
    if (answered && !singleCorrect && items[0]) {
      tabNotes.push({ string: items[0].string, fret: items[0].fret, state: 'correct' });
    }
  } else {
    tabNotes = items.map((it, i) => {
      const r = results[i];
      return {
        string: it.string,
        fret: it.fret,
        state: r ? (r.correct ? 'correct' : 'wrong') : !answered && !single && i === cursor ? 'current' : 'live',
        label: !single && r ? nameOf(it.midi) : undefined,
      };
    });
  }

  const fretChoices: number[] = [];
  for (let f = bottomFret; f <= topFret; f++) fretChoices.push(f);
  const checkWritten = () => {
    if (current.string == null || current.fret == null) return;
    playClickSound();
    engine.answerPosition(current.string, current.fret);
  };

  const goalPct = dailyGoal.target > 0 ? Math.min(100, Math.round((dailyGoal.completed / dailyGoal.target) * 100)) : 0;
  const goalDone = dailyGoal.completed >= dailyGoal.target;
  const goalBar = (
    <div className="teacher-goal staff-goal">
      <div className="teacher-goal-bar" aria-hidden="true">
        <span className="teacher-goal-fill" style={{ width: `${goalPct}%` }} />
      </div>
      <span className="teacher-goal-label">
        {t('Daily goal')}: {dailyGoal.completed}/{dailyGoal.target}{goalDone ? ' ✓' : ''}
      </span>
    </div>
  );

  const riffScore = results.filter((r) => r?.correct).length;
  const orientationHelp = t('In a tab the top line is the thinnest, highest string and the bottom line the thickest — upside down from the neck in this app, where the thickest string is on top.');

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
        <h1 className="interval-home-title">📝 {t('Tab reading')}</h1>

        <div className="settings-page-body">
          <ProGate
            feature="tabReading"
            variant="replace"
            pitch={t('Practise reading tabs and finding every number on the neck')}
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

            {!running && tab === 'practice' && (
              <div className="set-card scale-exercise-switcher staff-exercise-switcher" role="group" aria-label={t('Exercise')}>
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
                  {TAB_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`set-card-btn${range === r ? ' set-card-btn-primary' : ''}`}
                      onClick={() => setRange(r)}
                    >
                      {rangeLabel(r)}
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

            {!running && tab === 'progress' && (
              <div className="set-card">
                <TabProgressBoard
                  items={boardItems}
                  bottomFret={bottomFret}
                  topFret={topFret}
                  noteTable={instrument.notes}
                  stringCount={instrument.stringCount}
                  accidental={accidental}
                  notation={notation}
                />
              </div>
            )}

            {!running && tab === 'practice' && !finished && (
              <div className="set-card">
                <p className="set-card-help">{t(EXERCISE_HELP[exercise])}</p>
                <p className="set-card-help">{orientationHelp}</p>
                {goalBar}
                <button type="button" className="set-card-btn set-card-btn-primary" onClick={startSession}>
                  {t('Start')}
                </button>
              </div>
            )}

            {running && question && (
              <div className="set-card staff-card">
                <p className="set-card-help">
                  {exercise === 'readRiff' ? t('Riff') : t('Question')} {engine.questionNumber} / {engine.questionCount}
                  {' · '}{t('Score')}: {engine.session.score}
                </p>

                {exercise === 'writeTab' && (
                  <StaffNeckBoard
                    bottomFret={bottomFret}
                    topFret={topFret}
                    noteTable={instrument.notes}
                    stringCount={instrument.stringCount}
                    minFrets={instrument.minFrets}
                    reveal={null}
                    tapped={null}
                    marked={question.marked}
                    accidental={accidental}
                    notation={notation}
                  />
                )}

                <TabNotation
                  stringNames={stringNames}
                  notes={tabNotes}
                  slots={exercise === 'writeTab' ? 2 : 1}
                  endBar={exercise === 'readRiff'}
                  selectedString={exercise === 'writeTab' && !answered ? current.string : null}
                  label={exercise === 'writeTab' ? t('Tap the tab line of the string') : t('A number on the tab')}
                  onPickString={exercise === 'writeTab' && !answered
                    ? (s) => { playClickSound(); haptic.tap(); write({ string: s }); }
                    : undefined}
                />

                {/* Always rendered, so the answer appearing never shifts the board. */}
                <p className="staff-answer" aria-live="polite">
                  {answered && (single
                    ? <>{singleCorrect ? '✓ ' : '✗ '}{nameOf(items[0].midi)}</>
                    : <>{riffScore === items.length ? '✓ ' : ''}{riffScore}/{items.length}</>)}
                </p>

                {exercise === 'writeTab' && (
                  <>
                    <div className="tab-fret-row" role="group" aria-label={t('Fret')} dir="ltr">
                      {fretChoices.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`set-card-btn tab-fret-btn${current.fret === f ? ' set-card-btn-primary' : ''}`}
                          onClick={() => { playClickSound(); haptic.tap(); write({ fret: f }); }}
                          disabled={answered}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="staff-place-controls">
                      <button
                        type="button"
                        className="set-card-btn set-card-btn-primary"
                        onClick={checkWritten}
                        disabled={answered || current.string == null || current.fret == null}
                      >
                        {t('Check')}
                      </button>
                    </div>
                  </>
                )}

                {(exercise === 'nameNote' || exercise === 'readRiff') && (
                  <IntervalChoiceRow
                    variant="note"
                    options={tabNameOptions(naturalsOnly).map((n) => ({
                      value: n,
                      label: displayNote(n, accidental, notation),
                    }))}
                    onSelect={engine.selectName}
                    correct={single && answered ? pitchClassName(items[0].midi) : null}
                    wrong={single && results[0]?.picked != null && !singleCorrect ? results[0].picked : null}
                    disabled={answered}
                    dir={lang === 'he' ? 'rtl' : undefined}
                  />
                )}

                {exercise === 'findOnNeck' && (
                  <StaffNeckBoard
                    bottomFret={bottomFret}
                    topFret={topFret}
                    noteTable={instrument.notes}
                    stringCount={instrument.stringCount}
                    minFrets={instrument.minFrets}
                    reveal={answered ? items[0].positions : null}
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

            {!running && tab === 'practice' && finished && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Session complete!')} {t('Score')}: {engine.session.score}
                </p>
                {goalBar}
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
