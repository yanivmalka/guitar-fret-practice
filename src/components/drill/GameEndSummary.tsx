import AnimatedScore from '../AnimatedScore';
import { BadgeMedal, BadgeMedalDefs } from '../BadgeMedal';
import type { CelebratedBadge } from '../BadgeCelebration';
import { badgeDef, TIER_LABEL } from '../../utils/badges';
import { withClick as click } from '../../utils/withClick';
import type { InstrumentConfig } from '../../utils/instruments';

/**
 * The end-of-round "Round Complete!" card (score, streak, correct count and
 * any badges won this run). Presentation only — <App> owns the round state
 * and clears it via `onOk`.
 */
export default function GameEndSummary({
  t, showScore, score, longestStreak, questionsCorrect, questionsAnswered,
  newBadges, instrument, onOk,
}: {
  t: (s: string) => string;
  showScore: boolean;
  score: number;
  longestStreak: number;
  questionsCorrect: number;
  questionsAnswered: number;
  newBadges: CelebratedBadge[];
  instrument: InstrumentConfig;
  onOk: () => void;
}) {
  return (
    <div className="game-end-summary">
      <div className="game-end-title">🎉 {t('Round Complete!')}</div>
      {showScore && <div className="game-end-score"><AnimatedScore value={score} /> {t('pts')}</div>}
      <div className="game-end-details">
        {longestStreak >= 2 && <span>🔥 {longestStreak} {t('streak')}</span>}
        <span>✓ {questionsCorrect}/{questionsAnswered}</span>
      </div>
      {newBadges.length > 0 && (
        <div className="game-end-badges">
          <BadgeMedalDefs />
          {newBadges.map(({ id, tier }) => {
            const def = badgeDef(id, instrument);
            return (
              <div className="game-end-badge" key={id}>
                <BadgeMedal id={id} instrumentId={instrument.id} tier={tier} size={30} />
                {t('New badge')} · {def ? t(def.name) : id} — {t(TIER_LABEL[tier])}
              </div>
            );
          })}
        </div>
      )}
      <button className="clear-btn" onClick={click(onOk)}>{t('OK')}</button>
    </div>
  );
}
