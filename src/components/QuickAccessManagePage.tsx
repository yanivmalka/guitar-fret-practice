import { useSyncExternalStore } from 'react';
import { Chevron } from './Chevron';
import { withClick as click } from '../utils/withClick';
import QuickAccessGlyph from './QuickAccessGlyph';
import {
  quickAccessItem,
  subscribeQuickAccess,
  getPinnedQuick,
  removePinnedFromManager,
  type QuickAccessId,
} from '../utils/quickAccess';

/**
 * The full-page "remove a Quick Access shortcut" view. It is reachable only
 * from the cap prompt on a pushpin (`QuickAccessPinButton`) once five
 * shortcuts are already pinned and the user asks to make room — there is no
 * menu entry for it. It lists the five pinned shortcuts, each with a delete
 * control that unpins it immediately; the shortcut the user was trying to add
 * takes the freed slot automatically (see `removePinnedFromManager`). Back
 * returns to whichever settings sub-page the prompt was shown on.
 */
export default function QuickAccessManagePage({
  t, lang, onBack, values,
}: {
  t: (s: string) => string;
  lang: string;
  onBack: () => void;
  /** Current raw value of each pinnable setting, so each row's glyph matches
   *  what the shortcut would show on the strip. */
  values: Record<QuickAccessId, unknown>;
}) {
  const pinned = useSyncExternalStore(subscribeQuickAccess, getPinnedQuick) as QuickAccessId[];

  return (
    <div className="app settings-page">
      <div className="sp2 settings-page-inner" dir={lang === 'he' ? 'rtl' : undefined}>
        <div className="sp2-head settings-page-head">
          <button className="sp2-back" onClick={click(onBack)}>
            <Chevron dir="back" /> {t('Back')}
          </button>
        </div>
        <header className="settings-page-hero">
          <span className="settings-page-emoji" aria-hidden="true">📌</span>
          <h2 className="settings-page-name">{t('Remove a quick access shortcut')}</h2>
        </header>
        <div className="settings-page-body">
          <p className="set-card-help qa-manage-intro">
            {t('Quick access holds five shortcuts. Remove one to make room.')}
          </p>
          <ul className="qa-manage-list">
            {pinned.map((id) => {
              const item = quickAccessItem(id);
              return (
                <li key={id} className="qa-manage-row">
                  <span className="qa-manage-glyph" aria-hidden="true">
                    <QuickAccessGlyph id={id} value={values[id]} />
                  </span>
                  <span className="qa-manage-label">{t(item.label)}</span>
                  <button
                    type="button"
                    className="qa-manage-del"
                    aria-label={t('Remove {name} from quick access').replace('{name}', t(item.label))}
                    onClick={click(() => removePinnedFromManager(id))}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        d="M6 7h12M10 7V5h4v2M9 7l1 12h4l1-12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
