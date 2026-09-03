import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { playClickSound, haptic } from '../utils/feedback';

// First sign-in on a device that already has local guest practice (design
// §5.4). The user chooses whether that history joins the account or stays off
// it. Reuses the .mic-overlay / .mic-card confirm styling; no new CSS partial.

interface Props {
  /** Flattened guest history row count — drives the "large set" second confirm. */
  localRowCount: number;
  onMerge: () => void;
  onAccountOnly: () => void;
}

// Above this many local rows, "Use account only" asks a second time before
// leaving that practice off the account.
const LARGE_SET = 50;

export function GuestMergePrompt({ localRowCount, onMerge, onAccountOnly }: Props) {
  const { t } = useTranslation();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const click = (fn: () => void) => () => { playClickSound(); haptic.tap(); fn(); };

  const chooseAccountOnly = () => {
    if (localRowCount > LARGE_SET && !confirmDiscard) { setConfirmDiscard(true); return; }
    onAccountOnly();
  };

  return (
    <div className="mic-overlay">
      <div className="mic-card" onClick={e => e.stopPropagation()}>
        {confirmDiscard ? (
          <>
            <div className="mic-card-title">{t('Leave this practice off your account?')}</div>
            <p className="mic-card-body">
              {t('You have {n} rounds of practice saved on this device. If you continue, they stay on this device but are not added to your account.')
                .replace('{n}', String(localRowCount))}
            </p>
            <div className="mic-card-actions">
              <button className="mic-btn mic-btn-danger" onClick={click(onAccountOnly)}>
                {t('Use account only')}
              </button>
              <button className="mic-btn mic-btn-ghost" onClick={click(() => setConfirmDiscard(false))}>
                {t('Back')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mic-card-title">{t('Add this device’s progress to your account?')}</div>
            <p className="mic-card-body">
              {t('You’ve practiced on this device without an account. Add that progress to your account, or keep only what’s already on your account?')}
            </p>
            <div className="mic-card-actions">
              <button className="mic-btn mic-btn-primary" onClick={click(onMerge)}>
                {t('Merge my progress')}
              </button>
              <button className="mic-btn mic-btn-ghost" onClick={click(chooseAccountOnly)}>
                {t('Use account only')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
