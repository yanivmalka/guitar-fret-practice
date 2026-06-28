import { useState, useEffect, useRef } from 'react';
import { notesMatch, notes as allNotes } from '../utils/music';
import { playNoteSingle, stopPlayback } from '../utils/audio';

interface Props {
  notes: string[];
  activeNotes: Set<string>;
  active: boolean;
  correctNote: string | null;
  wrongNote: string | null;
  onSelect: (note: string) => void;
  guitarString: number;
  fretDots: Record<string, number[]>;
  byString: boolean;
}

function findFretForNote(note: string, stringIdx: number): number {
  const stringNotes = allNotes[stringIdx];
  for (let f = 0; f < stringNotes.length; f++) {
    if (notesMatch(stringNotes[f], note)) return f;
  }
  return 0;
}

// Smooth deceleration easing (ease-out cubic)
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function NoteCircle({ notes, activeNotes, active, correctNote, wrongNote, onSelect, guitarString, fretDots, byString }: Props) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const r = notes.length <= 7 ? 110 : 130;
  const step = (2 * Math.PI) / notes.length;
  const btnSize = 52;
  const degPerStep = 360 / notes.length;

  const [glowNote, setGlowNote] = useState<string | null>(null);
  // wheelAngle: accumulated rotation in degrees applied to the whole wheel
  const wheelAngleRef = useRef(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const prevFirstNoteRef = useRef(notes[0]);
  const prevNotesLengthRef = useRef(notes.length);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const firstNoteChanged = prevFirstNoteRef.current !== notes[0];
    const lengthChanged = prevNotesLengthRef.current !== notes.length;

    // Only animate rotation when byString is on and string changes (first note changes)
    if (byString && firstNoteChanged && !lengthChanged) {
      const prevFirst = prevFirstNoteRef.current;
      const nextFirst = notes[0];

      // Find index of prevFirst and nextFirst in current notes array
      const prevIdx = notes.findIndex(n => notesMatch(n, prevFirst));
      const nextIdx = 0; // nextFirst is always at index 0

      // Angular distance: how many steps to rotate
      // prevIdx tells us where the old top note now sits — we need to spin it back to top (index 0)
      // If prevFirst is now at index prevIdx, we need to rotate by -prevIdx steps to bring it back
      // But we want nextFirst at top, which means spinning by prevIdx steps (each step = degPerStep)
      let steps = prevIdx; // positive = clockwise
      if (steps === 0) {
        prevFirstNoteRef.current = notes[0];
        prevNotesLengthRef.current = notes.length;
        return;
      }

      // Shortest direction: if steps > half the circle, go the other way
      const half = notes.length / 2;
      if (steps > half) steps = steps - notes.length; // negative = counterclockwise

      const totalDeg = steps * degPerStep;
      const startAngle = wheelAngleRef.current;
      const targetAngle = startAngle + totalDeg;
      const DURATION = 500;
      const start = performance.now();

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const animate = (now: number) => {
        const t = Math.min((now - start) / DURATION, 1);
        const eased = easeOut(t);
        const current = startAngle + totalDeg * eased;
        wheelAngleRef.current = current;
        setWheelAngle(current);
        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          wheelAngleRef.current = targetAngle;
          setWheelAngle(targetAngle);
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }

    prevFirstNoteRef.current = notes[0];
    prevNotesLengthRef.current = notes.length;

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [notes[0], notes.length, byString]);

  const isNoteInRange = (note: string) => {
    for (const an of activeNotes) { if (notesMatch(an, note)) return true; }
    return false;
  };

  const hasDot = (note: string): string | null => {
    for (const [n, frets] of Object.entries(fretDots)) {
      if (notesMatch(n, note)) return frets.includes(12) ? '●●' : '●';
    }
    return null;
  };

  const handleClick = (note: string) => {
    stopPlayback();
    const fret = findFretForNote(note, guitarString - 1);
    playNoteSingle(guitarString, fret);
    setGlowNote(note);
    setTimeout(() => setGlowNote(null), 600);
    if (active) onSelect(note);
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Rotating wheel */}
      <div style={{
        position: 'absolute', width: size, height: size,
        transform: `rotate(${wheelAngle}deg)`,
        transformOrigin: `${cx}px ${cy}px`,
      }}>
        {notes.map((note, i) => {
          const angle = i * step - Math.PI / 2;
          const x = cx + r * Math.cos(angle) - btnSize / 2;
          const y = cy + r * Math.sin(angle) - btnSize / 2;
          const isCorrect = correctNote !== null && notesMatch(note, correctNote);
          const isWrong = wrongNote !== null && notesMatch(note, wrongNote);
          const inRange = isNoteInRange(note);
          const dots = hasDot(note);
          const isGlowing = glowNote === note;

          let bg = '#2a2a4a';
          let border = '#555';
          if (isCorrect) { bg = '#0a0'; border = '#0f0'; }
          else if (isWrong) { bg = '#a00'; border = '#f00'; }

          return (
            <button
              key={note}
              onClick={() => handleClick(note)}
              disabled={!inRange}
              className={`note-btn ${isGlowing ? 'note-glow' : ''}`}
              style={{
                position: 'absolute', left: x, top: y,
                width: btnSize, height: btnSize, borderRadius: '50%',
                background: bg, border: `2px solid ${border}`,
                color: '#fff', fontWeight: 'bold', fontSize: 15,
                cursor: inRange ? 'pointer' : 'default',
                opacity: inRange ? (active ? 1 : 0.7) : 0.25,
                flexDirection: 'column', gap: 0,
                // counter-rotate each button so text stays upright
                transform: `rotate(${-wheelAngle}deg)`,
              }}
            >
              <span style={{ lineHeight: 1.1 }}>{note}</span>
              {dots && <span className="fret-dot">{dots}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
