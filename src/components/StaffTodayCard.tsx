// ── StaffTodayCard — today's staff-reading goal on the Daily practice page ─
//
// staff-reading-spec.md §8. The staff domain's own card, beside (never
// merged into) the notes and intervals cards: progress toward today's
// separate `staffDaily` goal and one button that opens the Staff reading
// page. There is no planned staff session — the Staff reading page's own
// picker already favours the notes that are due.
//
// Reads the learning state itself (like the Scale / Staff screens) and
// re-reads on `learning-synced`, so an answer given on another device shows.

import { useEffect, useState } from 'react';
import { getInstrumentState, loadLearningState, rollDailyGoal } from '../learning/learningState';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

interface Props {
  instrumentId: string;
  busy?: boolean;
  onOpen: () => void;
}

export default function StaffTodayCard({ instrumentId, busy, onOpen }: Props) {
  const { t, lang } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const reread = () => setNow(Date.now());
    window.addEventListener('learning-synced', reread);
    return () => window.removeEventListener('learning-synced', reread);
  }, []);

  const st = getInstrumentState(loadLearningState(now), instrumentId, now);
  const goal = rollDailyGoal(st.staffDaily, now, st.staffDaily.target);
  const done = goal.completed >= goal.target;
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.completed / goal.target) * 100)) : 0;

  return (
    <section className="teacher-card staff-today-card" dir={lang === 'he' ? 'rtl' : undefined}>
      <header className="teacher-card-head">
        <span className="teacher-card-badge">⭐ {t('Premium')}</span>
        <h2 className="teacher-card-title">📖 {t("Today's staff reading")}</h2>
      </header>
      <p className="teacher-card-summary">
        {done
          ? <><strong>{t("Today's goal is done")} ✓</strong> — {t('one more round?')}</>
          : t('Read a round of notes on the staff — the notes that are due come first.')}
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
          ▶ {t('Open staff reading')}
        </button>
      </div>
    </section>
  );
}
