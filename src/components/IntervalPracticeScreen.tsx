// ── IntervalPracticeScreen — the "Intervals" learning tab (full page) ───
//
// One of the learning-type tabs from the drawer's "Learn" group. It hosts
// the P4 interval-drill entry (IntervalCard) as a full page instead of a
// card stacked on the home screen. Premium-only: the host mounts it behind
// `can('intervalDrill', tier)` and it is wrapped in <ProGate> as a second
// line of defence. All copy through `t()`; the layout flips for Hebrew via
// `dir`.

import type { IntervalForm } from '../utils/intervals';
import IntervalCard from './IntervalCard';
import { ProGate } from './ProGate';
import { Chevron } from './Chevron';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  /** Distinct interval qualities the SRS schedule is tracking so far. */
  trackedCount: number;
  headerIcon?: string;
  /** Disable the actions while a session is starting / running. */
  busy?: boolean;
  onStart: (form: IntervalForm) => void;
  onClose: () => void;
}

export default function IntervalPracticeScreen({
  trackedCount,
  headerIcon,
  busy,
  onStart,
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
            <IntervalCard trackedCount={trackedCount} busy={busy} onStart={onStart} />
          </ProGate>
        </div>
      </div>
    </div>
  );
}
