import type { AccidentalMode, OrderMode } from '../utils/music';

interface Props {
  guitarString: number;
  setGuitarString: (v: number) => void;
  time: number;
  setTime: (v: number) => void;
  fretFrom: number;
  setFretFrom: (v: number) => void;
  fretTo: number;
  setFretTo: (v: number) => void;
  accidental: AccidentalMode;
  setAccidental: (v: AccidentalMode) => void;
  order: OrderMode;
  setOrder: (v: OrderMode) => void;
  wholeToneOnly: boolean;
  setWholeToneOnly: (v: boolean) => void;
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button className={`chip ${selected ? 'chip-active' : ''}`} onClick={onClick}>{label}</button>
  );
}

export default function Settings(p: Props) {
  const strings = ['1(E)', '2(B)', '3(G)', '4(D)', '5(A)', '6(E)'];

  return (
    <div className="settings">
      <div className="setting-group">
        <span className="group-title">String</span>
        <div className="setting-row">
          {strings.map((s, i) => <Chip key={i} label={s} selected={p.guitarString === i + 1} onClick={() => p.setGuitarString(i + 1)} />)}
        </div>
      </div>
      <div className="setting-group">
        <span className="group-title">Time</span>
        <div className="setting-row">
          {[3, 4, 5, 7, 10].map(t => <Chip key={t} label={`${t}s`} selected={p.time === t} onClick={() => p.setTime(t)} />)}
        </div>
      </div>
      <div className="setting-group">
        <span className="group-title">Frets</span>
        <div className="setting-row">
          <button className="adj-btn" onClick={() => p.setFretFrom(Math.max(0, p.fretFrom - 1))}>−</button>
          <span className="range-val">{p.fretFrom}</span>
          <button className="adj-btn" onClick={() => p.setFretFrom(Math.min(p.fretTo, p.fretFrom + 1))}>+</button>
          <span className="range-val">to</span>
          <button className="adj-btn" onClick={() => p.setFretTo(Math.max(p.fretFrom, p.fretTo - 1))}>−</button>
          <span className="range-val">{p.fretTo}</span>
          <button className="adj-btn" onClick={() => p.setFretTo(Math.min(18, p.fretTo + 1))}>+</button>
        </div>
      </div>
      <div className="setting-group">
        <span className="group-title">Mode</span>
        <div className="setting-row">
          <Chip label="♯ Sharps" selected={p.accidental === 'sharps'} onClick={() => p.setAccidental('sharps')} />
          <Chip label="♭ Flats" selected={p.accidental === 'flats'} onClick={() => p.setAccidental('flats')} />
          <Chip label="Fifths" selected={p.order === 'fifths'} onClick={() => p.setOrder('fifths')} />
          <Chip label="Alpha" selected={p.order === 'alphabet'} onClick={() => p.setOrder('alphabet')} />
          <Chip label="Whole only" selected={p.wholeToneOnly} onClick={() => p.setWholeToneOnly(!p.wholeToneOnly)} />
        </div>
      </div>
    </div>
  );
}
