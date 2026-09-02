import { useState, useEffect, useRef } from 'react';
import { notesMatch, notes as allNotes, displayNote } from '../utils/music';
import type { AccidentalMode, NotationMode } from '../utils/music';
import { playNoteSequence, stopPlayback } from '../utils/audio';
import type { MasteryStat } from '../utils/mastery';

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
  showDots: boolean;
  accidental: AccidentalMode;
  notation: NotationMode;
  masteryByNote?: Record<string, MasteryStat>;
  showMastery?: boolean;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function NoteCircle({ notes, activeNotes, active, correctNote, wrongNote, onSelect, guitarString, fretDots, noteFrets, byString, startIndex, showDots, accidental, notation, masteryByNote, showMastery }: Props) {
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
  }, [startIndex, byString, degPerStep]);

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

  // Clear glow when a new question starts
  useEffect(() => { setGlowNote(null); }, [correctNote, wrongNote]);

  const handleClick = (note: string) => {
    stopPlayback();
    if (active) {
      // Answering: play the note once, not once per duplicate fret (e.g. E0 and E12)
      playNoteSequence(guitarString, [getPlayFrets(note)[0]], 600);
      onSelect(note);
      return;
    }
    const frets = getPlayFrets(note);
    const totalMs = Math.min(frets.length * 600, 1800);
    playNoteSequence(guitarString, frets, totalMs);
    setGlowNote(note);
    setTimeout(() => setGlowNote(null), totalMs);
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
          const isGlowing = !isCorrect && !isWrong && glowNote === note;
          const mastery = showMastery ? masteryByNote?.[note] : undefined;

          // The note button dims at rest, but the mastery bar must stay
          // full-strength so its green/orange matches the by-note FretGrid
          // equaliser exactly. So instead of fading the whole element, bake
          // the rest-dim into the circle's own bg/border colour and fade only
          // the letter + dot; the bar then renders at full opacity with no
          // fragile double-draw. (An earlier whole-element opacity + overlay
          // approach drew inconsistently across browsers, e.g. Samsung
          // Internet.)
          const restDim = inRange && !active;
          let bg = restDim ? 'rgba(42, 42, 74, 0.7)' : '#2a2a4a';
          let border = restDim ? 'rgba(85, 85, 85, 0.7)' : '#555';
          if (isCorrect) { bg = '#0a0'; border = '#0f0'; }
          else if (isWrong) { bg = '#a00'; border = '#f00'; }

          // A single solid bar whose length tracks accuracy — same visual
          // language (and colour) as the by-note FretGrid equaliser, which is
          // also a solid bar sized by accuracy with no track behind it. The
          // 15% floor keeps a low-accuracy note readable as a bar rather than
          // a sliver, mirroring FretGrid's non-zero minimum height.
          const masteryBar = mastery && mastery.level !== 'unplayed' ? (
            <span className="note-mastery-track">
              <span
                className={`note-mastery-fill mastery-${mastery.level}`}
                style={{ width: `${Math.round(15 + mastery.accuracy * 85)}%` }}
              />
            </span>
          ) : null;

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
                opacity: inRange ? 1 : 0.25,
                flexDirection: 'column', gap: 0,
              }}
            >
              <span style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                transform: `rotate(${-wheelAngle}deg)`,
              }}>
                <span style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                  opacity: restDim ? 0.7 : 1,
                }}>
                  <span style={{ lineHeight: 1.1 }}>{displayNote(note, accidental, notation)}</span>
                  {showDots && dotInfo && <span className="fret-dot" style={{ color: dotInfo.color }}>{dotInfo.dots}</span>}
                </span>
                {masteryBar}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
