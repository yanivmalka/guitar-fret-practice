// ── ScaleProgressBoard — the flat, grouped-by-scale-type board (spec §12) ──
//
// Read-only. Mirrors `IntervalBoard.tsx`'s presentation (same `string-bar-*`
// row styling, same three-state colour/status language as the Notes
// fretboard overlay), but grouped: one section header per scale type, then
// one row per that type's authored positions — the one presentational
// difference from Intervals' single flat list, because "grouped by scale
// type" is how a guitarist actually thinks about the material (§12) and
// because `rows` (from `buildScaleBoard`) is already in that order (pool
// iterates scale types outer, positions inner).
//
// No Scale Learning Path, no stars, no checkpoints — just each position's
// `not started` / `learning` / `mastered` status, derived every render.

import type { ScaleBoardRow } from '../learning/scaleMastery';
import { useTranslation } from '../i18n/useTranslation';

type Status = ScaleBoardRow['status'];

// English literal = i18n key (app convention) — same keys IntervalBoard uses.
const STATUS_LABEL: Record<Status, string> = {
  notStarted: 'not started',
  learning: 'learning',
  mastered: 'mastered',
};

const STATUS_COLOR: Record<Status, string> = {
  notStarted: 'var(--heat-unplayed)',
  learning: 'var(--heat-needs-work)',
  mastered: 'var(--heat-known-cell)',
};

const STATUS_BAR: Record<Status, string> = {
  notStarted: 'bar-growing',
  learning: 'bar-solid',
  mastered: 'bar-mastered',
};

interface Group {
  scaleTypeId: string;
  nameKey: string;
  rows: ScaleBoardRow[];
}

function groupByScaleType(rows: readonly ScaleBoardRow[]): Group[] {
  const groups: Group[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.scaleTypeId === r.scaleTypeId) last.rows.push(r);
    else groups.push({ scaleTypeId: r.scaleTypeId, nameKey: r.nameKey, rows: [r] });
  }
  return groups;
}

export default function ScaleProgressBoard({ rows }: { rows: ScaleBoardRow[] }) {
  const { t } = useTranslation();
  const groups = groupByScaleType(rows);
  const masteredCount = rows.filter((r) => r.status === 'mastered').length;

  if (rows.length === 0) {
    return <p className="set-card-help">{t('No scales shipped yet.')}</p>;
  }

  return (
    <div className="scale-board">
      <p className="set-card-help">
        {t('Scales mastered')}: {masteredCount}/{rows.length}
      </p>
      {groups.map((g) => (
        <div className="scale-board-group" key={g.scaleTypeId}>
          <h3 className="scale-board-group-title">{t(g.nameKey)}</h3>
          <div className="string-bars">
            {g.rows.map((r) => {
              const pct = Math.round(r.recentAccuracy * 100);
              const played = r.attempts > 0;
              return (
                <div className="string-bar-row" key={r.itemId}>
                  <span className="string-bar-label">
                    {t('Box')} {r.positionIndex}
                  </span>
                  <div className="string-bar-track">
                    <div
                      className={`string-bar-fill ${STATUS_BAR[r.status]}`}
                      style={{ width: `${played ? pct : 0}%` }}
                    />
                  </div>
                  <span className="string-bar-pct">{played ? `${pct}%` : '—'}</span>
                  <span className="string-bar-counts" style={{ color: STATUS_COLOR[r.status] }}>
                    {t(STATUS_LABEL[r.status])}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
