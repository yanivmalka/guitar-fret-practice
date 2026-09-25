// ── TabTodayCard — today's tab-reading goal on the Daily practice page ────
//
// tab-reading-spec.md §8. The tab domain's own card, beside (never merged
// into) the notes, intervals and staff cards: progress toward today's
// separate `tabDaily` goal and one button that opens the Tab reading page.
// There is no planned tab session — the Tab reading page's own picker
// already favours the positions that are due.
//
// Reads the learning state itself (like StaffTodayCard) and re-reads on
// `learning-synced`, so an answer given on another device shows.

import { useEffect, useState } from 'react';
import { getInstrumentState, loadLearningState, rollDailyGoal } from '../learning/learningState';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  instrumentId: string;
  busy?: boolean;
  onOpen: () => void;
}

export default function TabTodayCard({ instrumentId, busy, onOpen }: Props) {
  const { t, lang } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const reread = () => setNow(Date.now());
    window.addEventListener('learning-synced', reread);
    return () => window.removeEventListener('learning-synced', reread);
  }, []);

  const st = getInstrumentState(loadLearningState(now), instrumentId, now);
  const goal = rollDailyGoal(st.tabDaily, now, st.tabDaily.target);
  const done = goal.completed >= goal.target;
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;

  return (
    <section className="teacher-card staff-today-card" dir={lang === 'he' ? 'rtl' : undefined}>
      <header className="teacher-card-head">
        <span className="teacher-card-badge">⭐ {t('Premium')}</span>
        <h2 className="teacher-card-title">📝 {t("Today's tab reading")}</h2>
      </header>
      <p className="teacher-card-summary">
        {done
          ? <><strong>{t("Today's goal is done")} ✓</strong> — {t('one more round?')}</>
          : t('Read a round of tab — the places that are due come first.')}
      </p>
      <div className="teacher-goal">
        <div className="teacher-goal-bar" aria-hidden="true">
          <span className="teacher-goal-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="teacher-goal-label">
          {t('Daily goal')}: {goal.completed}/{goal.target}
        </span>
      </div>
      <div className="teacher-actions">
        <button
          type="button"
          className="teacher-btn teacher-btn-primary"
          disabled={busy}
          onClick={() => { playClickSound(); haptic.tap(); onOpen(); }}
        >
          ▶ {t('Open tab reading')}
        </button>
      </div>
    </section>
  );
}
