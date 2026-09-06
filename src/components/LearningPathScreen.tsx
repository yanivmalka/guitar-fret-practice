// ── LearningPathScreen — the Premium Learning Path, beside the Selector ──
//
// P3 (premium-product-plan.md §9 P3). A full page — same page-replacing
// treatment as "Stats & progress" — that shows the learner a named journey:
// an ordered list of checkpoints, each with a % mastered bar and 0–3 stars,
// the current one highlighted with its next step, and one button that starts
// the recommended session (already steered toward the current checkpoint by
// the planner). It never replaces the Selector; it is reachable from the
// Today card and closes straight back to the home screen.
//
// Premium-only: the host only mounts this behind `can('learningPath', tier)`,
// and it is wrapped in <ProGate> as a second line of defence. All copy goes
// through `t()`; the layout flips for Hebrew via `dir`.

import type { PathView, CheckpointView } from '../learning/pathProgress';
import type { TeacherPlan } from '../learning/planner';
import { ProGate } from './ProGate';
import { Chevron } from './Chevron';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  pathView: PathView;
  /** The recommended session (already Path-aware). Null only in the brief
   *  window before the first plan is built. */
  todayPlan: TeacherPlan | null;
  headerIcon?: string;
  busy?: boolean;
  onStart: (plan: TeacherPlan) => void;
  onClose: () => void;
}

function Stars({ n }: { n: 0 | 1 | 2 | 3 }) {
  return (
    <span className="lp-stars" aria-hidden="true">
      {'★'.repeat(n)}
      {'☆'.repeat(3 - n)}
    </span>
  );
}

function CheckpointRow({
  view,
  index,
  t,
}: {
  view: CheckpointView;
  index: number;
  t: (s: string) => string;
}) {
  const cls = [
    'lp-cp',
    view.current ? 'lp-cp-current' : '',
    !view.unlocked ? 'lp-cp-locked' : '',
    view.mastered ? 'lp-cp-mastered' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={cls}>
      <div className="lp-cp-head">
        <span className="lp-cp-index" aria-hidden="true">{index + 1}</span>
        <span className="lp-cp-title">{t(view.checkpoint.title)}</span>
        {view.unlocked ? (
          <Stars n={view.stars} />
        ) : (
          <span className="lp-cp-lock" aria-label={t('Locked')}>🔒</span>
        )}
      </div>
      <p className="lp-cp-blurb">{t(view.checkpoint.blurb)}</p>
      <div className="lp-cp-bar" aria-hidden="true">
        <span className="lp-cp-fill" style={{ width: `${view.pctMastered}%` }} />
      </div>
      <div className="lp-cp-meta">
        <span>
          {view.pctMastered}% {t('mastered')}
        </span>
        <span>
          {view.masteredCount}/{view.totalCount} {t('positions')}
        </span>
      </div>
      {view.current && (
        <p className="lp-cp-next">
          {view.mastered
            ? t('Every checkpoint mastered — keep it sharp.')
            : t('This is your next step.')}
        </p>
      )}
    </li>
  );
}

export default function LearningPathScreen({
  pathView,
  todayPlan,
  headerIcon,
  busy,
  onStart,
  onClose,
}: Props) {
  const { t, lang } = useTranslation();
  const current = pathView.checkpoints[pathView.currentIndex];

  const go = () => {
    if (busy || !todayPlan) return;
    playClickSound();
    haptic.tap();
    onStart(todayPlan);
  };

  return (
    <div className="app settings-page lp-page">
      <div className="sp2 settings-page-inner" dir={lang === 'he' ? 'rtl' : undefined}>
        <div className="sp2-head settings-page-head">
          <button className="sp2-back" onClick={() => { playClickSound(); haptic.tap(); onClose(); }}>
            <Chevron dir="back" /> {t('Back')}
          </button>
        </div>
        <header className="settings-page-hero">
          {headerIcon ? (
            <img src={headerIcon} alt="" className="settings-page-icon-img" />
          ) : (
            <span className="settings-page-emoji" aria-hidden="true">🧭</span>
          )}
          <h2 className="settings-page-name">{t('Learning Path')}</h2>
        </header>

        <div className="settings-page-body">
          <ProGate feature="learningPath" variant="replace" pitch={t('Follow a guided path from single notes onward')}>
            <p className="lp-intro">
              {t('A guided journey through the fretboard. Practise from the Selector whenever you like — your answers still move you along this path.')}
            </p>

            {current && (
              <section className="lp-current-card">
                <span className="lp-current-badge">⭐ {t('Premium')}</span>
                <h3 className="lp-current-title">{t(current.checkpoint.title)}</h3>
                <p className="lp-current-line">
                  {current.pctMastered}% {t('mastered')} · <Stars n={current.stars} />
                </p>
                <button
                  type="button"
                  className="lp-start-btn"
                  disabled={busy || !todayPlan}
                  onClick={go}
                >
                  ▶ {t('Practise toward this checkpoint')}
                </button>
              </section>
            )}

            <ol className="lp-list">
              {pathView.checkpoints.map((v, i) => (
                <CheckpointRow key={v.checkpoint.id} view={v} index={i} t={t} />
              ))}
            </ol>
          </ProGate>
        </div>
      </div>
    </div>
  );
}
