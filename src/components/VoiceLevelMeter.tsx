import { useMicLevel } from '../hooks/useMicLevel';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  /** True while a question is on screen in Voice answer mode. */
  active: boolean;
}

// Lower edge of the "loud enough" band. Speech that peaks below this is what
// makes Chrome's recogniser miss quiet answers, so the meter nudges the user up.
const GOOD_MIN = 0.16;

// A leaf component on purpose: `useMicLevel` updates on every animation frame,
// so it must not sit in a big component or the whole screen re-renders at 60fps.
export default function VoiceLevelMeter({ active }: Props) {
  const { t } = useTranslation();
  const { level, peak, ready } = useMicLevel(active);

  if (!active || !ready) return null;

  const pct = Math.round(level * 100);
  const loudEnough = peak >= GOOD_MIN;

  return (
    <div className="mic-level" role="img" aria-label={loudEnough ? t('Microphone level good') : t('Microphone level low, speak louder')}>
      <div className="mic-level-track">
        <div className="mic-level-goodzone" />
        <div
          className={`mic-level-fill ${loudEnough ? 'is-good' : 'is-low'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`mic-level-hint ${loudEnough ? 'is-good' : 'is-low'}`}>
        {loudEnough ? t('Good level') : t('Too quiet — speak up')}
      </span>
    </div>
  );
}
