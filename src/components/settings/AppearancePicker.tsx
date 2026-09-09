import { playClickSound, haptic } from '../../utils/feedback';
import {
  SEASONS, THEME_MODES, themeAttr, type Season, type ThemeMode,
} from '../../utils/theme';

/**
 * The two theme axes (mode × season) as a single control.
 *
 * They stay two rows — a 3-wide mode row and a 4-wide season row — rather than
 * one 12-cell grid, because the axes really are independent and a 12-way
 * control does not fit a narrow phone. What makes it one control instead of
 * two stacked `PickRow`s is that every tile carries a live swatch of the
 * palette it would produce *in combination with the other axis's current
 * value*: the mode tiles preview the selected season, the season tiles preview
 * the selected mode. So the cross-product is visible without switching.
 *
 * The swatches read the real tokens rather than duplicating any colour: each
 * one sets its own `data-theme="<season>-<mode>"`, which is an attribute
 * selector in `src/styles/00-tokens.css`, so the custom properties resolve
 * seasonally inside that element only. Retuning a palette retunes the swatch.
 */

const MODE_LABEL: Record<ThemeMode, string> = {
  dark: 'Dark', night: 'Night', day: 'Day',
};
const SEASON_LABEL: Record<Season, string> = {
  winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn',
};
/** A miniature of one (season, mode) palette: its ground, accent and the
 *  functional colours the drill leans on most. Decorative — the tile's text
 *  label is what the control announces. */
function Swatch({ season, mode }: { season: Season; mode: ThemeMode }) {
  return (
    <span className="ap-swatch" data-theme={themeAttr(season, mode)} aria-hidden="true">
      <span className="ap-swatch-dot" />
      <span className="ap-swatch-bars">
        <i className="ap-swatch-bar ap-swatch-bar-a" />
        <i className="ap-swatch-bar ap-swatch-bar-b" />
        <i className="ap-swatch-bar ap-swatch-bar-c" />
      </span>
    </span>
  );
}

function Tile({
  on, label, swatchSeason, swatchMode, onPick,
}: {
  on: boolean;
  label: string;
  swatchSeason: Season;
  swatchMode: ThemeMode;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={`ap-tile${on ? ' ap-tile-on' : ''}`}
      aria-pressed={on}
      onClick={() => {
        if (on) return;
        playClickSound();
        haptic.tap();
        onPick();
      }}
    >
      <Swatch season={swatchSeason} mode={swatchMode} />
      <span className="ap-tile-l">{label}</span>
    </button>
  );
}

export interface AppearancePickerProps {
  t: (s: string) => string;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  season: Season;
  setSeason: (s: Season) => void;
}

export default function AppearancePicker({
  t, mode, setMode, season, setSeason,
}: AppearancePickerProps) {
  return (
    <div className="ap">
      <div className="ap-axis">
        <span className="ap-axis-k">{t('Theme')}</span>
        <div className="ap-row ap-row-3" role="group" aria-label={t('Theme')}>
          {THEME_MODES.map((m) => (
            <Tile
              key={m}
              on={m === mode}
              label={t(MODE_LABEL[m])}
              swatchSeason={season}
              swatchMode={m}
              onPick={() => setMode(m)}
            />
          ))}
        </div>
      </div>
      <div className="ap-axis">
        <span className="ap-axis-k">{t('Season')}</span>
        <div className="ap-row ap-row-4" role="group" aria-label={t('Season')}>
          {SEASONS.map((s) => (
            <Tile
              key={s}
              on={s === season}
              label={t(SEASON_LABEL[s])}
              swatchSeason={s}
              swatchMode={mode}
              onPick={() => setSeason(s)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
