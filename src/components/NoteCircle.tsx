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
}

function findFretForNote(note: string, stringIdx: number): number {
  const stringNotes = allNotes[stringIdx];
  for (let f = 0; f < stringNotes.length; f++) {
    if (notesMatch(stringNotes[f], note)) return f;
  }
  return 0;
}

export default function NoteCircle({ notes, activeNotes, active, correctNote, wrongNote, onSelect, guitarString }: Props) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = notes.length <= 7 ? 90 : 110;
  const step = (2 * Math.PI) / notes.length;

  const isNoteInRange = (note: string) => {
    for (const an of activeNotes) {
      if (notesMatch(an, note)) return true;
    }
    return false;
  };

  const handleClick = (note: string) => {
    stopPlayback();
    const fret = findFretForNote(note, guitarString - 1);
    playNoteSingle(guitarString, fret);
    if (active) onSelect(note);
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {notes.map((note, i) => {
        const angle = i * step - Math.PI / 2;
        const x = cx + r * Math.cos(angle) - 20;
        const y = cy + r * Math.sin(angle) - 20;
        const isCorrect = correctNote !== null && notesMatch(note, correctNote);
        const isWrong = wrongNote !== null && notesMatch(note, wrongNote);
        const inRange = isNoteInRange(note);

        let bg = '#2a2a4a';
        let border = '#555';
        if (isCorrect) { bg = '#0a0'; border = '#0f0'; }
        else if (isWrong) { bg = '#a00'; border = '#f00'; }

        return (
          <button
            key={note}
            onClick={() => handleClick(note)}
            disabled={!inRange}
            style={{
              position: 'absolute', left: x, top: y,
              width: 40, height: 40, borderRadius: '50%',
              background: bg, border: `2px solid ${border}`,
              color: '#fff', fontWeight: 'bold', fontSize: 13,
              cursor: inRange ? 'pointer' : 'default',
              opacity: inRange ? (active ? 1 : 0.7) : 0.25,
              transition: 'all 0.2s',
            }}
          >
            {note}
          </button>
        );
      })}
    </div>
  );
}
