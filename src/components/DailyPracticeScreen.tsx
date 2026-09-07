// ── DailyPracticeScreen — the "Daily practice" learning tab (full page) ─
//
// One of the learning-type tabs reachable from the drawer's "Learn" group.
// It hosts the Premium Teacher's Today card as a full page (the same
// page-replacing treatment as Stats / the Learning Path), instead of a card
// stacked on the home screen. Premium-only: the host mounts it behind
// `can('premiumTeacher', tier)` and it is wrapped in <ProGate> as a second
// line of defence. All copy through `t()`; the layout flips for Hebrew via
// `dir`.

import type { AccidentalMode, NotationMode } from '../utils/music';
import type { InstrumentConfig } from '../utils/instruments';
import type { TeacherPlan } from '../learning/planner';
import type { DailyGoal } from '../learning/learningState';
import TodayCard from './TodayCard';
import { ProGate } from './ProGate';
import { Chevron } from './Chevron';
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
  headerIcon?: string;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  onStart: (plan: TeacherPlan) => void;
  /** Open the full Learning Path screen (P3). Omitted ⇒ the link is hidden. */
  onOpenPath?: () => void;
  onClose: () => void;
}

export default function DailyPracticeScreen({
  todayPlan,
  weakSpotsPlan,
  dailyGoal,
  goalComplete,
  accidental,
  notation,
  instrument,
  headerIcon,
  busy,
  onStart,
  onOpenPath,
  onClose,
}: Props) {
  const { t, lang } = useTranslation();

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
            <span className="settings-page-emoji" aria-hidden="true">📅</span>
          )}
          <h2 className="settings-page-name">{t('Daily practice')}</h2>
        </header>

        <div className="settings-page-body">
          <ProGate
            feature="premiumTeacher"
            variant="replace"
            pitch={t('Let the Teacher plan your practice')}
          >
            {todayPlan ? (
              <TodayCard
                todayPlan={todayPlan}
                weakSpotsPlan={weakSpotsPlan}
                dailyGoal={dailyGoal}
                goalComplete={goalComplete}
                accidental={accidental}
                notation={notation}
                instrument={instrument}
                busy={busy}
                onStart={onStart}
                onOpenPath={onOpenPath}
              />
            ) : (
              <p className="lp-intro">{t('Your daily plan is loading…')}</p>
            )}
          </ProGate>
        </div>
      </div>
    </div>
  );
}
