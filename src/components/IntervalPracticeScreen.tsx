// ── IntervalPracticeScreen — the "Intervals" learning tab (full page) ───
//
// One of the learning-type tabs from the drawer's "Learn" group. It hosts the
// free Interval Selector (intervals-learning-spec §5) as a full page instead
// of a card stacked on the home screen. The guided "Today's intervals" card
// is *not* here — anything daily-plan-shaped lives on the Daily practice tab
// (<DailyPracticeScreen>). Premium-only: the host mounts it behind
// `can('intervalDrill', tier)` and it is wrapped in <ProGate> as a second
// line of defence. All copy through `t()`; the layout flips for Hebrew via
// `dir`.

import { useMemo } from 'react';
import type { InstrumentConfig } from '../utils/instruments';
import type { AccidentalMode, OrderMode } from '../utils/music';
import type { DrillConfig } from '../drill/DrillConfig';
import type { IntervalBoardRow } from '../learning/intervalMastery';
import IntervalSelectorPanel from './IntervalSelectorPanel';
import { ProGate } from './ProGate';
import { Chevron } from './Chevron';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  instrument: InstrumentConfig;
  /** The flat 11-interval board — used only to resolve the Selector's
   *  "All learned" pick (§5.2) from the mastered qualities. */
  intervalBoard: IntervalBoardRow[];
  accidental: AccidentalMode;
  order: OrderMode;
  /** Distinct interval qualities the SRS schedule is tracking so far. */
  trackedCount: number;
  headerIcon?: string;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  /** Silent mode is on — forwarded so the Selector can hide the audio-only
   *  "Identify the interval" exercise. */
  silentMode?: boolean;
  /** Start a free Selector-configured session. */
  onStart: (config: DrillConfig) => void;
  onClose: () => void;
}

export default function IntervalPracticeScreen({
  instrument,
  intervalBoard,
  accidental,
  order,
  trackedCount,
  headerIcon,
  busy,
  silentMode,
  onStart,
  onClose,
}: Props) {
  const { t, lang } = useTranslation();

  const masteredSizes = useMemo(
    () => intervalBoard.filter((r) => r.status === 'mastered').map((r) => r.semitones),
    [intervalBoard],
  );

  return (
    <div className="app settings-page lp-page">
      <div className="sp2 settings-page-inner" dir={lang === 'he' ? 'rtl' : undefined}>
        <div className="sp2-head settings-page-head">
          <button
            className="sp2-back"
            onClick={() => { playClickSound(); haptic.tap(); onClose(); }}
          >
            <Chevron dir="back" /> {t('Back')}
          </button>
        </div>
        <header className="settings-page-hero">
          {headerIcon ? (
            <img src={headerIcon} alt="" className="settings-page-icon-img" />
          ) : (
            <span className="settings-page-emoji" aria-hidden="true">🎸</span>
          )}
          <h2 className="settings-page-name">{t('Interval training')}</h2>
        </header>

        <div className="settings-page-body">
          <ProGate
            feature="intervalDrill"
            variant="replace"
            pitch={t('Practise hearing and finding intervals')}
          >
            <IntervalSelectorPanel
              instrument={instrument}
              masteredSizes={masteredSizes}
              accidental={accidental}
              order={order}
              trackedCount={trackedCount}
              busy={busy}
              silentMode={silentMode}
              onStart={onStart}
            />
          </ProGate>
        </div>
      </div>
    </div>
  );
}
