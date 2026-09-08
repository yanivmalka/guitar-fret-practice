import { withClick as click } from '../utils/withClick';
import { saveSetting } from '../utils/settings';

type AnswerMode = 'tap' | 'voice';

/**
 * The friendly in-app microphone card shown ahead of (primer) or in place of
 * (denied) the browser's own permission prompt. Presentation only — <App>
 * owns the `micPrompt` state and the actual permission request.
 */
export default function MicPermissionCard({
  micPrompt, t, grantMic, setMicPrompt, setAnswerMode,
}: {
  micPrompt: 'primer' | 'denied';
  t: (s: string) => string;
  grantMic: () => void | Promise<void>;
  setMicPrompt: (v: null | 'primer' | 'denied') => void;
  setAnswerMode: (m: AnswerMode) => void;
}) {
  return (
    <div className="mic-overlay" onClick={click(() => setMicPrompt(null))}>
      <div
        className="mic-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('Microphone access')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mic-card-icon" aria-hidden="true">🎤</div>
        {micPrompt === 'primer' ? (
          <>
            <div className="mic-card-title">{t('Answer out loud')}</div>
            <p className="mic-card-body">
              {t('Voice mode listens for the note or fret you say instead of a tap.')}
              {' '}
              {t('Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.')}
            </p>
            <div className="mic-card-actions">
              <button className="mic-btn mic-btn-primary" onClick={click(() => { void grantMic(); })}>
                {t('Allow microphone')}
              </button>
              <button className="mic-btn mic-btn-ghost" onClick={click(() => setMicPrompt(null))}>
                {t('Not now')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mic-card-title">{t('Microphone is blocked')}</div>
            <p className="mic-card-body">
              {t("Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to")}
              {' '}<strong>{t('Allow')}</strong>{t(', then reload the page.')}
            </p>
            <div className="mic-card-actions">
              <button className="mic-btn mic-btn-primary" onClick={click(() => setMicPrompt(null))}>
                {t('Got it')}
              </button>
              <button
                className="mic-btn mic-btn-ghost"
                onClick={click(() => { setAnswerMode('tap'); saveSetting('pref_answerMode', 'tap'); setMicPrompt(null); })}
              >
                {t('Use tap instead')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
