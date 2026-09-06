import type { Difficulty } from '../hooks/useSelector';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, playToggleOffSound, haptic } from '../utils/feedback';

const DIFF_LABEL: Record<Difficulty, string> = {
  dots: 'Dots',
  naturals: 'Naturals',
  full: 'Full',
};

interface Props {
  direction: 'harder' | 'easier';
  // The difficulty the "apply" button switches to (already one step up/down).
  target: Difficulty;
  onApply: () => void;
  onDismiss: () => void;
}

// A small, one-off nudge shown under the Selector when recent accuracy on the
// current settings combination says the drill is now too easy or too hard.
// Presentational only: App decides when it appears, what the target difficulty
// is, and persists the dismissal. Not a revival of the Stage sequence — it just
// pre-fills a Selector change the user still has to accept.
export default function AdjustSuggestionBanner({ direction, target, onApply, onDismiss }: Props) {
  const { t, lang } = useTranslation();
  const targetLabel = t(DIFF_LABEL[target]);

  const headline = direction === 'harder'
    ? t('You’re cruising through this — ready for a harder level?')
    : t('This setup is fighting back. Want to ease off a level?');
  const detail = direction === 'harder'
    ? `${t('Switch the difficulty to')} ${targetLabel}.`
    : `${t('Drop the difficulty to')} ${targetLabel}.`;

  return (
    <div
      className={`adjust-suggest adjust-suggest-${direction}`}
      role="status"
      aria-live="polite"
      dir={lang === 'he' ? 'rtl' : undefined}
    >
      <div className="adjust-suggest-text">
        <span className="adjust-suggest-headline">
          {direction === 'harder' ? '📈 ' : '📉 '}{headline}
        </span>
        <span className="adjust-suggest-detail">{detail}</span>
      </div>
      <div className="adjust-suggest-actions">
        <button
          type="button"
          className="adjust-suggest-apply"
          onClick={() => { playClickSound(); haptic.tap(); onApply(); }}
        >
          {t('Apply')}
        </button>
        <button
          type="button"
          className="adjust-suggest-dismiss"
          onClick={() => { playToggleOffSound(); haptic.tap(); onDismiss(); }}
          aria-label={t('Dismiss')}
        >
          {t('Not now')}
        </button>
      </div>
    </div>
  );
}
