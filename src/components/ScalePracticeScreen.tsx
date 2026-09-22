// ── ScalePracticeScreen — the "Scales" second home screen ───────────────
//
// One of the learning-type tabs from the drawer's "Learn" group, styled like
// IntervalPracticeScreen (a second home screen, no Back row — the hamburger
// drawer is the only way off). Premium-only: the host mounts it behind
// `can('scaleDrill', tier)` and it is wrapped in <ProGate> as a second line
// of defence.
//
// Unlike Intervals, this screen does NOT hand a `DrillConfig` back to the
// host's shared `useGameEngine` — Exercise A runs on its own dedicated
// `useScaleDrillEngine` + `ScaleShapeBoard` (see their header comments for
// why: the shared engine's byNote flow can't answer a multi-string,
// multi-note-name shape). So this screen owns its own start/running/summary
// states instead of delegating the run back up.
//
// Slice 1 (scales-learning-spec.md §4.2): Minor Pentatonic only, "all
// positions" pool, no Selector controls yet (scale-type / position / exercise
// / difficulty pickers are later increments — §5 in full).

import { useMemo, useState } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import { useScaleDrillEngine } from '../hooks/useScaleDrillEngine';
import { buildScalePool } from '../learning/scaleDrill';
import ScaleShapeBoard from './ScaleShapeBoard';
import { ProGate } from './ProGate';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

const QUESTION_COUNT = 10;
const TIME_LIMIT = 14;

interface Props {
  instrument: InstrumentConfig;
  /** Whether the hamburger button is shown — hidden while the drawer is
   *  already open, matching IntervalPracticeScreen. */
  showMenuButton?: boolean;
  /** Open the hamburger drawer (the host owns the drawer state + nav). */
  onOpenMenu: () => void;
}

export default function ScalePracticeScreen({ instrument, showMenuButton = true, onOpenMenu }: Props) {
  const { t, lang } = useTranslation();
  const [finished, setFinished] = useState(false);

  const pool = useMemo(
    () => buildScalePool(['minorPentatonic'], instrument.stringCount),
    [instrument.stringCount],
  );

  const engine = useScaleDrillEngine({
    instrument: { notes: instrument.notes, stringCount: instrument.stringCount, maxFret: instrument.maxFret },
    pool,
    questionCount: QUESTION_COUNT,
    timeLimit: TIME_LIMIT,
    onComplete: () => setFinished(true),
  });

  const startSession = () => {
    playClickSound(); haptic.tap();
    setFinished(false);
    engine.start();
  };

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
            {!engine.running && !finished && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('The app marks a root note. Tap every other note of the minor pentatonic shape around it.')}
                </p>
                <button type="button" className="set-card-btn set-card-btn-primary" onClick={startSession}>
                  {t('Start')}
                </button>
              </div>
            )}

            {engine.running && engine.question && (
              <div className="set-card">
                <p className="set-card-help">
                  {t('Question')} {engine.questionNumber} / {engine.questionCount}
                  {' · '}{t('Found')} {engine.foundPositions.length} / {engine.question.shape.length}
                </p>
                <ScaleShapeBoard
                  question={engine.question}
                  foundPositions={engine.foundPositions}
                  wrongPosition={engine.wrongPosition}
                  active={engine.running}
                  onSelect={engine.selectPosition}
                />
              </div>
            )}

            {!engine.running && finished && (
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
