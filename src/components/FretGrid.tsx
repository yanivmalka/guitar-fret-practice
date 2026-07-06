interface Props {
  fretFrom: number;
  fretTo: number;
  active: boolean;
  correctFrets: number[];
  wrongFret: number | null;
  foundFrets: number[];
  onSelect: (fret: number) => void;
}

const DOT_FRETS = new Set([3, 5, 7, 9, 12, 15, 17]);

export default function FretGrid({ fretFrom, fretTo, active, correctFrets, wrongFret, foundFrets, onSelect }: Props) {
  const frets = Array.from({ length: fretTo - fretFrom + 1 }, (_, i) => fretFrom + i);

  return (
    <div className="fret-grid">
      {frets.map(f => {
        const isFound = foundFrets.includes(f);
        const isWrong = wrongFret === f;
        const isCorrectReveal = correctFrets.includes(f) && !active && !isFound;

        let cls = 'fret-btn';
        if (isFound) cls += ' fret-found';
        else if (isWrong) cls += ' fret-wrong';
        else if (isCorrectReveal) cls += ' fret-reveal';

        const dot = DOT_FRETS.has(f) ? (f === 12 ? '●●' : '●') : '';

        return (
          <button
            key={f}
            className={cls}
            disabled={!active || isFound}
            onClick={() => onSelect(f)}
          >
            <span className="fret-btn-num">{f}</span>
            {dot && <span className="fret-btn-dot">{dot}</span>}
          </button>
        );
      })}
    </div>
  );
}
