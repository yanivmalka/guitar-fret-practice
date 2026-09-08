import { withClick as click } from '../utils/withClick';

/**
 * The one-time "Save your progress" sign-in nudge shown to guests right after
 * onboarding. Reuses the mic card styling. Presentation only — <App> owns the
 * visibility condition and the `signInPromptSeen` flag.
 */
export default function SignInNudge({
  t, onSignIn, onDismiss,
}: {
  t: (s: string) => string;
  onSignIn: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mic-overlay" onClick={click(onDismiss)}>
      <div
        className="mic-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('Sign in')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mic-card-icon" aria-hidden="true">☁️</div>
        <div className="mic-card-title">{t('Save your progress')}</div>
        <p className="mic-card-body">
          {t('Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.')}
        </p>
        <div className="mic-card-actions">
          <button
            className="mic-btn mic-btn-primary"
            onClick={click(() => { onSignIn(); })}
          >
            {t('Sign in')}
          </button>
          <button className="mic-btn mic-btn-ghost" onClick={click(onDismiss)}>
            {t('Maybe later')}
          </button>
        </div>
      </div>
    </div>
  );
}
