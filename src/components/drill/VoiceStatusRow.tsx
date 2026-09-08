import { withClick as click } from '../../utils/withClick';
import type { UseVoiceAnswerResult } from '../../hooks/useVoiceAnswer';

/**
 * The one-line voice-recognition status readout shown under the question while
 * answering by voice. Presentation only — <App> owns the `voiceActive`
 * condition and the `voice` engine state.
 */
export default function VoiceStatusRow({
  voice, t,
}: {
  voice: UseVoiceAnswerResult;
  t: (s: string) => string;
}) {
  return (
    <div className={`voice-status voice-${voice.status}`} role="status" aria-live="polite">
      {voice.permission === 'denied'
        ? t('🎤 Microphone blocked — enable it or switch to tap')
        : voice.error === 'network'
          ? t('🎤 Voice needs a connection')
          : voice.error === 'not-supported'
            ? t('🎤 Voice isn’t working in this browser — try Chrome, or use tap')
          : voice.error
            ? t('🎤 Didn’t catch that')
            : voice.status === 'listening'
              ? `🎤 ${t('Listening…')}${voice.partial ? ` “${voice.partial}”` : ''}`
              : voice.status === 'heard'
                ? `🎤 “${voice.partial}”`
                : t('🎤 …')}
      {(voice.status === 'error') && (
        <button className="clear-btn voice-retry" onClick={click(voice.retry)}>{t('Retry')}</button>
      )}
    </div>
  );
}
