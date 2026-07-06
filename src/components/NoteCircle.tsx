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
  startIndex: number;
}

function findFretForNote(note: string, stringIdx: number): number {
  const stringNotes = allNotes[stringIdx];
  for (let f = 0; f < stringNotes.length; f++) {
    if (notesMatch(stringNotes[f], note)) return f;
  }
  return 0;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function NoteCircle({ notes, activeNotes, active, correctNote, wrongNote, onSelect, guitarString, fretDots, byString, startIndex }: Props) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const r = notes.length <= 7 ? 110 : 130;
  const step = (2 * Math.PI) / notes.length;
  const btnSize = 52;
  const degPerStep = 360 / notes.length;

  const [glowNote, setGlowNote] = useState<string | null>(null);
  const [wheelAngle, setWheelAngle] = useState(0);
  const wheelAngleRef = useRef(0);
  const prevStartIndexRef = useRef(startIndex);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!byString) {
      // Animate back to 0 if byString turned off
      if (wheelAngleRef.current !== 0) {
        animateTo(0);
      }
      prevStartIndexRef.current = 0;
      return;
    }

    const prevIdx = prevStartIndexRef.current;
    const nextIdx = startIndex;
    prevStartIndexRef.current = nextIdx;

    if (prevIdx === nextIdx) return;

    // Target angle: -startIndex * degPerStep (rotate so startIndex note is at top)
    const target = -nextIdx * degPerStep;
    animateTo(target);
  }, [startIndex, byString]);

  function animateTo(target: number) {
    // Normalize to shortest path from current angle
    const current = wheelAngleRef.current;
    let delta = target - current;
    // Shortest path
    const full = 360;
    while (delta > full / 2) delta -= full;
    while (delta < -full / 2) delta += full;

    const from = current;
    const to = current + delta;
    const DURATION = 500;
    const start = performance.now();

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const animate = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      const val = from + delta * easeOut(t);
      wheelAngleRef.current = val;
      setWheelAngle(val);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        wheelAngleRef.current = to;
        setWheelAngle(to);
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }

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
