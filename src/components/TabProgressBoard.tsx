// ── TabProgressBoard — the Tab reading "Progress" tab ─────────────────────
//
// tab-reading-spec.md §9. Read-only. Every tab position of the chosen range
// on a neck grid, its fret number in the tile, coloured by the same
// three-state language as the other boards (not started / learning /
// mastered), so the learner sees which strings and frets they already read.
//
// Drawn as the app's own neck (lowest string on top, ScaleOrderBoard's grid
// and its left-handed mirroring), not as a tab: it shows where on the
// instrument the reading is solid.
//
// `TabStatusList` is the same idea for chords and technique symbols
// (tab-reading-spec.md §13), which have no single place on the neck: one
// tile per chord shape or symbol.

import type { TabBoardItem, TabStatus } from '../learning/tabMastery';
import { displayNote, activeDotFrets, type AccidentalMode, type NotationMode } from '../utils/music';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  items: readonly TabBoardItem[];
  bottomFret: number;
  topFret: number;
  noteTable: readonly (readonly string[])[];
  stringCount: number;
  accidental: AccidentalMode;
  notation: NotationMode;
}

// English literal = i18n key (app convention) — same keys the other boards use.
const STATUS_LABEL: Record<TabStatus, string> = {
  notStarted: 'not started',
  learning: 'learning',
  mastered: 'mastered',
};

export default function TabProgressBoard({
  items, bottomFret, topFret, noteTable, stringCount, accidental, notation,
}: Props) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  const byPos = new Map(items.map((it) => [`${it.string}:${it.fret}`, it]));
  const count = (s: TabStatus) => items.filter((i) => i.status === s).length;
  const frets: number[] = [];
  for (let f = bottomFret; f <= topFret; f++) frets.push(f);
  const strings = Array.from({ length: stringCount }, (_, i) => stringCount - i);
  const dots = new Set(activeDotFrets);

  return (
    <div className="staff-board">
      <p className="set-card-help">
        {t('Places mastered')}: {count('mastered')}/{items.length}
      </p>
      <div className="staff-board-legend">
        {(['mastered', 'learning', 'notStarted'] as const).map((s) => (
          <span key={s} className={`staff-board-key staff-board-key-${s}`}>
            {t(STATUS_LABEL[s])} · {count(s)}
          </span>
        ))}
      </div>
      <div
        className="scale-order-board staff-neck-board"
        dir="ltr"
        role="img"
        aria-label={t('Your progress on the neck')}
        style={{ '--order-frets': frets.length } as React.CSSProperties}
      >
        {strings.map((s) => (
          <div key={s} className="scale-order-row">
            <span className="scale-order-string">
              {displayNote(noteTable[s - 1]?.[0] ?? '', accidental, notation)}
            </span>
            {frets.map((f) => {
              const it = byPos.get(`${s}:${f}`);
              let cls = 'scale-order-tile staff-neck-tile tab-board-tile';
              if (f === 0) cls += ' staff-neck-open';
              cls += it ? ` tab-board-${it.status}` : ' staff-neck-unplayable';
              return <span key={f} className={cls}>{it ? f : ''}</span>;
            })}
          </div>
        ))}
        <div className="scale-order-row scale-order-frets" aria-hidden="true">
          <span className="scale-order-string" />
          {frets.map((f) => (
            <span key={f} className={`scale-order-fret${dots.has(f) ? ' staff-neck-dot' : ''}`}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The Progress tab for chords and technique symbols: one tile per item —
 *  its name and, under it, the shape or symbol's meaning — coloured by the
 *  same three statuses as the neck board. */
export function TabStatusList({ heading, items }: {
  heading: string;
  items: readonly { key: string; label: string; sub: string; status: TabStatus }[];
}) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  const count = (s: TabStatus) => items.filter((i) => i.status === s).length;
  return (
    <div className="staff-board">
      <p className="set-card-help">
        {heading}: {count('mastered')}/{items.length}
      </p>
      <div className="staff-board-legend">
        {(['mastered', 'learning', 'notStarted'] as const).map((s) => (
          <span key={s} className={`staff-board-key staff-board-key-${s}`}>
            {t(STATUS_LABEL[s])} · {count(s)}
          </span>
        ))}
      </div>
      <div className="tab-status-list">
        {items.map((it) => (
          <span key={it.key} className={`tab-status-tile tab-board-${it.status}`}>
            <bdi className="tab-status-label" dir="ltr">{it.label}</bdi>
            <span className="tab-status-sub">{it.sub}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
