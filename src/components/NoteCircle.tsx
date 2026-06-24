import { useState } from 'react';
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
}

function findFretForNote(note: string, stringIdx: number): number {
  const stringNotes = allNotes[stringIdx];
  for (let f = 0; f < stringNotes.length; f++) {
    if (notesMatch(stringNotes[f], note)) return f;
  }
  return 0;
}

export default function NoteCircle({ notes, activeNotes, active, correctNote, wrongNote, onSelect, guitarString, fretDots }: Props) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const r = notes.length <= 7 ? 110 : 130;
  const step = (2 * Math.PI) / notes.length;
  const btnSize = 52;

  const [glowNote, setGlowNote] = useState<string | null>(null);

  const isNoteInRange = (note: string) => {
    for (const an of activeNotes) {
      if (notesMatch(an, note)) return true;
    }
    return false;
  };

  const hasDot = (note: string): number[] | null => {
    for (const [n, frets] of Object.entries(fretDots)) {
      if (notesMatch(n, note)) return frets;
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
            }}
          >
            {note}
            {dots && <span className="fret-dot">{'●'.repeat(Math.min(dots.length, 2))}</span>}
          </button>
        );
      })}
    </div>
  );
}
