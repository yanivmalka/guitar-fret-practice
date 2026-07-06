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

const DOT_FRETS = new Set([3, 5, 7, 9, 12, 15, 17]);

export default function FretGrid({ fretFrom, fretTo, guitarString, validFrets, active, correctFrets, wrongFret, foundFrets, onSelect }: Props) {
  const frets = Array.from({ length: fretTo - fretFrom + 1 }, (_, i) => fretFrom + i);

  const handleClick = (f: number) => {
    playNoteSingle(guitarString, f);
    // only call game handler when actively playing and fret is valid
    if (active && !isDisabledFilter(f)) onSelect(f);
  };

  const isDisabledFilter = (f: number) => !validFrets.has(f);

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
