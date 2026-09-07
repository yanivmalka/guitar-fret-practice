// ── LearnHub — the "Learn" drawer page: one tile per learning domain ────
//
// A single hamburger-drawer sub-page (settingsSections id 'learn') that lays
// out every learning domain as a tile, so the drawer keeps one row instead of
// a long list. 'notes' is the Selector (always open); 'daily' and 'intervals'
// are Premium — a tile the user's tier can't reach shows a lock and opens the
// upgrade page. Scales / Chords / Staff reading / Game are inert "coming soon"
// tiles (premium-product-plan.md §9 P5–P7 + the Game layer).
//
// All copy through `t()`; the grid inherits `dir` from the settings page root.

import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

export type LearnDomain = 'notes' | 'daily' | 'intervals';

interface Props {
  activeDomain: LearnDomain;
  canDaily: boolean;
  canIntervals: boolean;
  /** Open the given domain (closes the drawer). */
  onPick: (d: LearnDomain) => void;
  /** A locked (Premium) tile was tapped — open the upgrade page. */
  onLocked: () => void;
}

interface OpenTile {
  kind: 'open';
  id: LearnDomain;
  emoji: string;
  label: string;
  locked: boolean;
}
interface SoonTile {
  kind: 'soon';
  emoji: string;
  label: string;
}

export default function LearnHub({
  activeDomain,
  canDaily,
  canIntervals,
  onPick,
  onLocked,
}: Props) {
  const { t } = useTranslation();

  const tiles: Array<OpenTile | SoonTile> = [
    { kind: 'open', id: 'daily', emoji: '📅', label: 'Daily practice', locked: !canDaily },
    { kind: 'open', id: 'notes', emoji: '🎵', label: 'Notes', locked: false },
    { kind: 'open', id: 'intervals', emoji: '🎸', label: 'Intervals', locked: !canIntervals },
    { kind: 'soon', emoji: '🎼', label: 'Scales' },
    { kind: 'soon', emoji: '🎹', label: 'Chords' },
    { kind: 'soon', emoji: '📖', label: 'Staff reading' },
    { kind: 'soon', emoji: '🎮', label: 'Game' },
  ];

  return (
    <>
      <p className="set-card-help">{t('Choose what to practise.')}</p>
      <div className="learn-hub">
        {tiles.map((tile) => {
          if (tile.kind === 'soon') {
            return (
              <div
                key={tile.label}
                className="learn-tile learn-tile--soon"
                aria-disabled="true"
              >
                <span className="learn-tile__emoji" aria-hidden="true">{tile.emoji}</span>
                <span className="learn-tile__label">{t(tile.label)}</span>
                <span className="learn-tile__state">{t('Coming soon')}</span>
              </div>
            );
          }

          const current = tile.id === activeDomain && !tile.locked;
          const cls = [
            'learn-tile',
            current ? 'learn-tile--current' : '',
            tile.locked ? 'learn-tile--locked' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={tile.id}
              type="button"
              className={cls}
              aria-current={current ? 'page' : undefined}
              onClick={() => {
                playClickSound();
                haptic.tap();
                if (tile.locked) onLocked();
                else onPick(tile.id);
              }}
            >
              <span className="learn-tile__emoji" aria-hidden="true">{tile.emoji}</span>
              <span className="learn-tile__label">{t(tile.label)}</span>
              <span className="learn-tile__state">
                {tile.locked
                  ? <>🔒 {t('Premium')}</>
                  : current
                    ? t('Current')
                    : ''}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
