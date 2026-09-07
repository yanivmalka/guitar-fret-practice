// ── IntervalBoard — the flat 11-interval status board (spec §12) ────────
//
// Read-only. One row per drilled interval quality, in curriculum order, each
// showing its short label, its full (localised) name, a thin recent-accuracy
// bar and a `not started` / `learning` / `mastered` status — the same
// three-level visual language as the Notes fretboard mastery overlay
// (`utils/mastery.ts`'s `unplayed / needsWork / known`).
//
// There is NO interval Learning Path: no stars, no state pills, no lock
// icons, no per-stage bars, no checkpoints, no "n/7". Just the 11 qualities
// and where each one stands, derived every render from `intervalSrs` +
// `intervalHistory` (see `buildIntervalBoard`). Reuses ProgressPanel's
// `string-bar-*` row styling — no new stylesheet.

import type { IntervalBoardRow } from '../learning/intervalMastery';
import { useTranslation } from '../i18n/useTranslation';

type Status = IntervalBoardRow['status'];

// English literal = i18n key (app convention).
const STATUS_LABEL: Record<Status, string> = {
  notStarted: 'not started',
  learning: 'learning',
  mastered: 'mastered',
};

// Same colour roles as ProgressPanel's fretboard heatmap.
const STATUS_COLOR: Record<Status, string> = {
  notStarted: 'var(--heat-unplayed)',
  learning: 'var(--amber)',
  mastered: 'var(--success)',
};

// Reuse the three bar-fill classes BarRows already ships.
const STATUS_BAR: Record<Status, string> = {
  notStarted: 'bar-growing',
  learning: 'bar-solid',
  mastered: 'bar-mastered',
};

export default function IntervalBoard({ rows }: { rows: IntervalBoardRow[] }) {
  const { t } = useTranslation();
  return (
    <div className="string-bars ivl-board">
      {rows.map((r) => {
        const pct = Math.round(r.recentAccuracy * 100);
        const played = r.attempts > 0;
        return (
          <div className="string-bar-row" key={r.semitones}>
            <span className="string-bar-label">{r.short}</span>
            <div className="string-bar-track">
              <div
                className={`string-bar-fill ${STATUS_BAR[r.status]}`}
                style={{ width: `${played ? pct : 0}%` }}
              />
            </div>
            <span className="string-bar-pct">{played ? `${pct}%` : '—'}</span>
            <span className="string-bar-counts">
              {t(r.nameKey)}
              {' · '}
              <span style={{ color: STATUS_COLOR[r.status] }}>
                {t(STATUS_LABEL[r.status])}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
