import type { ReactNode } from 'react';
import { Chevron } from '../Chevron';
import { withClick as click } from '../../utils/withClick';
import { BadgeRevealOverlay, type CelebratedBadge } from '../BadgeCelebration';
import type { InstrumentConfig } from '../../utils/instruments';
import type { Lang } from '../../i18n/translations';

/**
 * The hamburger settings drawer, split out of <App> as pure presentation:
 * <SettingsDrawerNav> is the side-sheet list of section titles, and
 * <SettingsSubPage> is the full-page view of one section's body. <App> still
 * owns the `settingsSections` array (each `body` is now a section component)
 * and the open/section state; these two just render it.
 */
export interface SettingsSection {
  id: string;
  title: string;
  icon?: string;
  blurb: string;
  body: ReactNode;
  onSelect?: () => void;
}

export function SettingsDrawerNav({
  sections, lang, t, setSettingsOpen, setDrawerSection,
}: {
  sections: SettingsSection[];
  lang: Lang;
  t: (s: string) => string;
  setSettingsOpen: (v: boolean) => void;
  setDrawerSection: (id: string | null) => void;
}) {
  return (
    <div className="settings-overlay" onClick={click(() => setSettingsOpen(false))}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('Game settings')}
        onClick={(e) => e.stopPropagation()}
      >
        <nav className="settings-menu" dir={lang === 'he' ? 'rtl' : undefined}>
          <div className="sp2-head">
            <button
              className="sp2-back"
              onClick={click(() => setSettingsOpen(false))}
            >
              <Chevron dir="back" /> {t('Back')}
            </button>
            {/* No title here on purpose: the burger menu is just the list
                of sections. "Settings" is one of those sections now. */}
          </div>
          {sections.filter(s => s.id !== 'upgrade' && s.id !== 'badges').map(s => {
            // `upgrade` (subscription tier) and `badges` are not top-level
            // rows — each is a tappable tile inside the Account section that
            // opens its sub-page. They stay in `settingsSections` only so
            // that sub-page still resolves by id.
            // `s.icon` is a real image (the metal 3D tab icons); sections
            // without one (upgrade, badges — not shown as top-level rows
            // right now) fall back to the old "<emoji> <label>" title
            // convention, split apart so the emoji is its own leading-icon
            // node and never disturbs the bidi resolution of the
            // (possibly RTL) label text next to it.
            const [emoji, ...rest] = s.icon ? [] : s.title.split(' ');
            return (
              <button
                key={s.id}
                className="nav-row"
                onClick={click(() => { if (s.onSelect) s.onSelect(); else setDrawerSection(s.id); })}
              >
                <span className="nav-row__lead" aria-hidden="true">
                  {s.icon ? <img src={s.icon} alt="" className="nav-row__icon-img" /> : emoji}
                </span>
                <span className="nav-row__label">{s.icon ? s.title : rest.join(' ')}</span>
                <Chevron dir="forward" className="nav-row__chev" />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function SettingsSubPage({
  section, lang, t, drawerSection, upgradeFromAccountRef, setDrawerSection,
  revealBadges, instrument, setRevealBadges,
}: {
  section: SettingsSection;
  lang: Lang;
  t: (s: string) => string;
  drawerSection: string | null;
  upgradeFromAccountRef: { current: boolean };
  setDrawerSection: (id: string | null) => void;
  revealBadges: CelebratedBadge[];
  instrument: InstrumentConfig;
  setRevealBadges: (b: CelebratedBadge[]) => void;
}) {
  return (
    <div className="app settings-page">
      <div className="sp2 settings-page-inner" dir={lang === 'he' ? 'rtl' : undefined}>
        <div className="sp2-head settings-page-head">
          {/* Badges is a sub-page of Account (opened from the pinned-badge
              picker), so Back returns there, not to the hamburger list.
              Upgrade is a sub-page of Account too when opened from the
              plan tile, but can also be opened directly by a locked
              ProGate elsewhere — upgradeFromAccountRef tracks which. */}
          <button
            className="sp2-back"
            onClick={click(() => {
              const backToAccount = drawerSection === 'badges'
                || (drawerSection === 'upgrade' && upgradeFromAccountRef.current);
              setDrawerSection(backToAccount ? 'account' : null);
            })}
          >
            <Chevron dir="back" /> {t('Back')}
          </button>
        </div>
        <header className="settings-page-hero">
          {section.icon ? (
            <img src={section.icon} alt="" className="settings-page-icon-img" />
          ) : (
            <span className="settings-page-emoji" aria-hidden="true">
              {section.title.split(' ')[0]}
            </span>
          )}
          <h2 className="settings-page-name">
            {section.icon ? section.title : section.title.slice(section.title.indexOf(' ') + 1)}
          </h2>
        </header>
        <div className="settings-page-body">{section.body}</div>
      </div>
      {/* This full-screen settings sub-page is its own return path, so the
          reveal fired by an admin Grant on the Badges wall must be mounted
          here too — the copy in the main return never renders from here. */}
      {revealBadges.length > 0 && (
        <BadgeRevealOverlay
          badges={revealBadges}
          instrument={instrument}
          onClose={() => setRevealBadges([])}
        />
      )}
    </div>
  );
}
