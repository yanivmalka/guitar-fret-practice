import { useRef } from 'react';
import { playNoteSingle } from '../utils/audio';
import { notes } from '../utils/music';

interface Props {
  fretFrom: number;
  fretTo: number;
  guitarString: number;
  validFrets: Set<number>;
  active: boolean;
  correctFrets: number[];
  wrongFret: number | null;
  foundFrets: number[];
  onSelect: (fret: number) => void;
}

const DOT_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);

export default function FretGrid({
  fretFrom, fretTo, guitarString, validFrets,
  active, correctFrets, wrongFret, foundFrets, onSelect,
}: Props) {
  const frets = Array.from({ length: fretTo - fretFrom + 1 }, (_, i) => fretFrom + i);
  // Map fret number → button DOM node for direct glow control
  const btnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const glowTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const isDisabledFilter = (f: number) => !validFrets.has(f);

  const flashGlow = (f: number) => {
    const btn = btnRefs.current.get(f);
    if (!btn) return;
    // Clear any existing timer for this fret
    const existing = glowTimers.current.get(f);
    if (existing) clearTimeout(existing);
    // Add glow class immediately
    btn.classList.add('fret-glow');
    // Remove it after 400ms — right after the note sound finishes
    const timer = setTimeout(() => {
      btn.classList.remove('fret-glow');
      glowTimers.current.delete(f);
    }, 400);
    glowTimers.current.set(f, timer);
  };

  const handleClick = (f: number) => {
    playNoteSingle(guitarString, f);
    flashGlow(f);
    // Blur immediately so browser focus ring doesn't linger
    btnRefs.current.get(f)?.blur();
    if (active && !isDisabledFilter(f)) onSelect(f);
  };

  return (
    <div className="fret-grid">
      {frets.map(f => {
        const isFound = foundFrets.includes(f);
        const isWrong = wrongFret === f;
        const isCorrectReveal = correctFrets.includes(f) && !active && !isFound;
        const isFilterDisabled = isDisabledFilter(f);

        let cls = 'fret-btn';
        if (isFound) cls += ' fret-found';
        else if (isWrong) cls += ' fret-wrong';
        else if (isCorrectReveal) cls += ' fret-reveal';
        else if (isFilterDisabled) cls += ' fret-disabled';

        const dot = DOT_FRETS.has(f) ? (f === 12 ? '●●' : '●') : '';
        const noteName = isFilterDisabled ? notes[guitarString - 1][f] : '';

        return (
          <button
            key={f}
            className={cls}
            disabled={isFilterDisabled || isFound}
            ref={el => { if (el) btnRefs.current.set(f, el); else btnRefs.current.delete(f); }}
            onClick={() => handleClick(f)}
            title={noteName}
          >
            <span className="fret-btn-num">{f}</span>
            {dot && <span className="fret-btn-dot">{dot}</span>}
          </button>
        );
      })}
    </div>
  );
}
