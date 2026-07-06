import { useState, useEffect, useRef } from 'react';
import { notesMatch, notes as allNotes } from '../utils/music';
import { playNoteSequence, stopPlayback } from '../utils/audio';

interface Props {
  notes: string[];
  activeNotes: Set<string>;
  active: boolean;
  correctNote: string | null;
  wrongNote: string | null;
  onSelect: (note: string) => void;
  guitarString: number;
  fretDots: Record<string, number[]>;   // physical dot frets per note
  noteFrets: Record<string, number[]>;  // all valid frets per note (for playback)
  byString: boolean;
  startIndex: number;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function NoteCircle({ notes, activeNotes, active, correctNote, wrongNote, onSelect, guitarString, fretDots, noteFrets, byString, startIndex }: Props) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const r = notes.length <= 7 ? 110 : 130;
  const step = (2 * Math.PI) / notes.length;
  const btnSize = 52;
  const degPerStep = 360 / notes.length;

  const [glowNote, setGlowNote] = useState<string | null>(null);
  const initialAngle = byString ? -startIndex * (360 / notes.length) : 0;
  const [wheelAngle, setWheelAngle] = useState(initialAngle);
  const wheelAngleRef = useRef(initialAngle);
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

  const hasDot = (note: string): { dots: string; color: string } | null => {
    let dotFrets: number[] | null = null;
    for (const [n, frets] of Object.entries(fretDots)) {
      if (notesMatch(n, note)) { dotFrets = frets; break; }
    }
    if (!dotFrets) return null;
    // count all valid frets for this note (including open) for color
    let totalFrets = 1;
    for (const [n, frets] of Object.entries(noteFrets)) {
      if (notesMatch(n, note)) { totalFrets = frets.length; break; }
    }
    const dotStr = dotFrets.includes(12) ? '●●' : '●';
    const color = totalFrets === 1 ? '#ff0' : totalFrets === 2 ? '#f90' : '#f44';
    return { dots: dotStr, color };
  };

  const getPlayFrets = (note: string): number[] => {
    for (const [n, frets] of Object.entries(noteFrets)) {
      if (notesMatch(n, note)) return frets;
    }
    // fallback: find first fret
    const stringNotes = allNotes[guitarString - 1];
    for (let f = 0; f < stringNotes.length; f++) {
      if (notesMatch(stringNotes[f], note)) return [f];
    }
    return [0];
  };

  const handleClick = (note: string) => {
    stopPlayback();
    const frets = getPlayFrets(note);
    const totalMs = Math.min(frets.length * 600, 1800);
    playNoteSequence(guitarString, frets, totalMs);
    setGlowNote(note);
    setTimeout(() => setGlowNote(null), totalMs);
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
          const dotInfo = hasDot(note);
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
              <span style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                transform: `rotate(${-wheelAngle}deg)`,
              }}>
                <span style={{ lineHeight: 1.1 }}>{note}</span>
                {dotInfo && <span className="fret-dot" style={{ color: dotInfo.color }}>{dotInfo.dots}</span>}
              </span>            </button>
          );
        })}
      </div>
    </div>
  );
}
