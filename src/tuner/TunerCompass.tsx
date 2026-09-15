import { classifyCents, zoneColor } from './tuningZones';

// A clock-hand-style needle pivoting from the exact center of the note
// wheel (not a car-speedometer gauge pivoting from the bottom edge with a
// painted colored arc behind it). 12 o'clock = in tune; the hand swings
// toward 9 when flat and toward 3 when sharp, matching a standard clip-on
// tuner's flat-left / sharp-right convention. There's no background color
// zone — the needle's OWN color is what encodes distance from in-tune, so
// color changes as it moves, the same way its angle does.

const SIZE = 150;
const CENTER = SIZE / 2;
const NEEDLE_LENGTH = 62;
const MAX_CENTS = 50; // needle pins at its max swing beyond this; the number shown below is still the real value

function centsToAngleDeg(cents: number): number {
  const clamped = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, cents));
  // -50 cents -> 180deg (9 o'clock), 0 -> 90deg (12 o'clock), +50 -> 0deg (3 o'clock)
  return 1.8 * (MAX_CENTS - clamped);
}

function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER - radius * Math.sin(rad) };
}

interface Props {
  /** null while there's no target note (nothing pinned and nothing detected). */
  cents: number | null;
}

export default function TunerCompass({ cents }: Props) {
  const hasReading = cents !== null;
  const zone = hasReading ? classifyCents(cents) : null;
  const needleColor = zone ? zoneColor(zone) : 'var(--text-2, #888)';
  const needleAngle = centsToAngleDeg(hasReading ? cents : 0);
  const tip = polarPoint(needleAngle, NEEDLE_LENGTH);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: SIZE,
        height: SIZE,
        pointerEvents: 'none',
      }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Fixed reference tick at 12 o'clock — where the needle should end up. */}
        <line
          x1={CENTER}
          y1={CENTER - NEEDLE_LENGTH - 4}
          x2={CENTER}
          y2={CENTER - NEEDLE_LENGTH + 6}
          stroke="var(--border-soft, #555)"
          strokeWidth={2}
        />
        {/* Needle, pivoting from the center like a clock hand. */}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={tip.x}
          y2={tip.y}
          stroke={needleColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={CENTER} cy={CENTER} r={5} fill={needleColor} />
      </svg>
    </div>
  );
}
