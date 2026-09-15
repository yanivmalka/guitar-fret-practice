import { useEffect, useRef, useState } from 'react';
import TunerCompass from './TunerCompass';
import { classifyCents, zoneColor } from './tuningZones';
import { STANDARD_TUNING_STRINGS } from './standardTuning';

// A circle-of-fifths note wheel, visually modeled on the app's NoteCircle
// (src/components/NoteCircle.tsx): 12 notes arranged around a ring, ordered
// by fifths. Kept as its own small component (not importing NoteCircle)
// since NoteCircle is wired to quiz state, audio playback and mastery data
// this tuner prototype has no use for — only the fifths ordering
// (src/utils/music.ts's cofNotesSharp) and the rotate-to-top geometry are
// shared, not the component.
//
// Two modes:
//  - Auto (nothing pinned): the ring rotates so whatever note is currently
//    detected sits under the fixed 12-o'clock pointer.
//  - Pinned: clicking a note button locks it at 12 o'clock (a padlock marks
//    it) regardless of what's being played, so the player can pick "this is
//    the string I'm tuning" and see the compass measure distance from THAT
//    target rather than from whatever note the raw pitch happens to be
//    nearest to.

// Same ordering as src/utils/music.ts's cofNotesSharp, duplicated here so
// this stays a standalone prototype (see src/tuner/README.md) — reconciled
// with the real util at integration time.
const COF_NOTES_SHARP = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface Props {
  /** Note that should sit at 12 o'clock: the pinned note if one is set, else whatever's currently detected. */
  targetNote: string | null;
  /** Non-null when the player has locked a target note; equals targetNote in that case. */
  pinnedNote: string | null;
  /** Cents offset of the current reading from targetNote (for the pointer/compass color); null when there's nothing to show. */
  cents: number | null;
  onSelectNote: (note: string) => void;
  /** Accessible/tooltip labels — passed down already translated so this component stays i18n-agnostic. */
  pinLabel: string;
  unpinLabel: string;
}

export default function NoteWheel({ targetNote, pinnedNote, cents, onSelectNote, pinLabel, unpinLabel }: Props) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;
  const btnSize = 48;
  const step = (2 * Math.PI) / COF_NOTES_SHARP.length;
  const degPerStep = 360 / COF_NOTES_SHARP.length;

  const [wheelAngle, setWheelAngle] = useState(0);
  const wheelAngleRef = useRef(0);
  const prevIndexRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  function animateTo(target: number) {
    const current = wheelAngleRef.current;
    let delta = target - current;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    const from = current;
    const DURATION = 200; // faster than NoteCircle's quiz-answer 500ms — this tracks a live signal, not a one-off reveal
    const start = performance.now();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const animate = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      const val = from + delta * easeOut(t);
      wheelAngleRef.current = val;
      setWheelAngle(val);
      if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    if (!targetNote) return; // hold the wheel in place while there's nothing to point at
    const nextIndex = COF_NOTES_SHARP.indexOf(targetNote);
    if (nextIndex < 0 || nextIndex === prevIndexRef.current) return;
    prevIndexRef.current = nextIndex;
    animateTo(-nextIndex * degPerStep);
  }, [targetNote, degPerStep]);

  const zone = cents !== null ? classifyCents(cents) : null;
  const pointerColor = zone ? zoneColor(zone) : 'var(--text-2)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Fixed pointer at 12 o'clock, marking which ring position is the target */}
      <div
        style={{
          position: 'absolute',
          left: cx - 10,
          top: 0,
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: `16px solid ${pointerColor}`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          transform: `rotate(${wheelAngle}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        {COF_NOTES_SHARP.map((note, i) => {
          const angle = i * step - Math.PI / 2;
          const x = cx + r * Math.cos(angle) - btnSize / 2;
          const y = cy + r * Math.sin(angle) - btnSize / 2;
          const isTarget = note === targetNote;
          const isPinned = note === pinnedNote;
          const bg = isTarget ? pointerColor : 'var(--surface-border)';
          const border = isTarget ? pointerColor : 'var(--border-soft)';
          const stringNumbers = STANDARD_TUNING_STRINGS[note];
          return (
            <button
              key={note}
              onClick={() => onSelectNote(note)}
              title={isPinned ? unpinLabel : pinLabel}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: btnSize,
                height: btnSize,
                borderRadius: '50%',
                background: bg,
                border: `2px solid ${border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                // Fixed white, not var(--text-0): the target button's own
                // background is a fixed saturated status color (success/amber/
                // danger, not a theme surface), so it needs a fixed
                // high-contrast text color the same way NoteCircle's
                // correct/wrong flash does — a themed text token could land
                // low-contrast against it in some palettes.
                color: isTarget ? '#fff' : 'var(--text-0)',
                fontWeight: 'bold',
                fontSize: 15,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, transform: `rotate(${-wheelAngle}deg)` }}>
                <span style={{ lineHeight: 1 }}>{note}</span>
                {stringNumbers && (
                  <span style={{ fontSize: 9, fontWeight: 'normal', opacity: 0.85, lineHeight: 1 }}>
                    {stringNumbers.join('/')}
                  </span>
                )}
                {isPinned && <span style={{ fontSize: 9, lineHeight: 1 }}>🔒</span>}
              </span>
            </button>
          );
        })}
      </div>
      <TunerCompass cents={cents} />
    </div>
  );
}
