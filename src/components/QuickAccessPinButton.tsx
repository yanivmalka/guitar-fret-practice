import { useSyncExternalStore, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';
import { SegmentedControl } from './SettingCard';
import {
  type QuickAccessId,
  subscribeQuickAccess,
  getQuickAccessEnabled,
  setQuickAccessEnabled,
  getPinnedQuick,
  togglePinnedQuick,
  openQuickAccessManager,
  MAX_QUICK_PINNED,
} from '../utils/quickAccess';

// Two small self-contained controls for the Settings screen, so the section
// bodies (`GeneralSettingsSection`, `PlayingSection`) stay presentation-only and
// own no hooks — same pattern as `<PinnedBadges>` / `<AboutCard>`.

/**
 * The on/off row that enables the Quick Access widget. Bound straight to the
 * external store so it and every pushpin update together.
 */
export function QuickAccessEnableToggle() {
  const { t } = useTranslation();
  const enabled = useSyncExternalStore(subscribeQuickAccess, getQuickAccessEnabled);
  return (
    <SegmentedControl
      ariaLabel={t('Quick access')}
      value={enabled ? 'on' : 'off'}
      options={[
        { value: 'on', label: t('On') },
        { value: 'off', label: t('Off') },
      ]}
      onChange={(v) => setQuickAccessEnabled(v === 'on')}
    />
  );
}

/**
 * The fixed pushpin in a pinnable setting card's top-right corner. Tapping it
 * opens a small confirm tile (the `GuestMergePrompt` structure) that pins or
 * unpins this setting from the Quick Access strip.
 */
export function QuickAccessPinButton({ itemId }: { itemId: QuickAccessId }) {
  const { t } = useTranslation();
  const pinnedList = useSyncExternalStore(subscribeQuickAccess, getPinnedQuick);
  const pinned = pinnedList.includes(itemId);
  const atCap = !pinned && pinnedList.length >= MAX_QUICK_PINNED;
  const [confirm, setConfirm] = useState(false);
  const click = (fn: () => void) => () => { playClickSound(); haptic.tap(); fn(); };

  return (
    <>
      <button
        type="button"
        className={`qa-pin${pinned ? ' qa-pin-on' : ''}`}
        aria-pressed={pinned}
        aria-label={pinned ? t('Remove from quick access?') : t('Pin to quick access?')}
        onClick={click(() => setConfirm(true))}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path
            d="M9 3h6l-1 5 3 3v2h-4v6l-1 2-1-2v-6H6v-2l3-3-1-5z"
            fill={pinned ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {confirm && atCap && (
        // The strip is already full. Rather than a dead-end "remove one first"
        // note, offer to jump to the full-page manager (the only way in) or
        // leave things as they are.
        <div className="mic-overlay" onClick={() => setConfirm(false)}>
          <div className="mic-card" onClick={(e) => e.stopPropagation()}>
            <div className="mic-card-title">{t('Quick access is full')}</div>
            <p className="mic-card-body">
              {t('You already have {n} shortcuts. Remove one to make room?')
                .replace('{n}', String(MAX_QUICK_PINNED))}
            </p>
            <div className="mic-card-actions">
              <button
                className="mic-btn mic-btn-primary"
                onClick={click(() => { setConfirm(false); openQuickAccessManager(itemId); })}
              >
                {t('Remove one')}
              </button>
              <button className="mic-btn mic-btn-ghost" onClick={click(() => setConfirm(false))}>
                {t('Leave as is')}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm && !atCap && (
        <div className="mic-overlay" onClick={() => setConfirm(false)}>
          <div className="mic-card" onClick={(e) => e.stopPropagation()}>
            <div className="mic-card-title">
              {pinned ? t('Remove from quick access?') : t('Pin to quick access?')}
            </div>
            <div className="mic-card-actions">
              <button
                className="mic-btn mic-btn-primary"
                onClick={click(() => { togglePinnedQuick(itemId); setConfirm(false); })}
              >
                {t('Yes')}
              </button>
              <button className="mic-btn mic-btn-ghost" onClick={click(() => setConfirm(false))}>
                {t('No')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
