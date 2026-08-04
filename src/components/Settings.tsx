import type { AccidentalMode, OrderMode, NotationMode } from '../utils/music';
import { displayNote } from '../utils/music';
import { playClickSound, haptic } from '../utils/feedback';

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
  dotsOnly: boolean;
  setDotsOnly: (v: boolean) => void;
  byString: boolean;
  setByString: (v: boolean) => void;
  byNote: boolean;
  setByNote: (v: boolean) => void;
  multiStrings: number[];
  setMultiStrings: (v: number[]) => void;
  activeNotes: Set<string>;
  showOrderSwitcher: boolean;
  notation: NotationMode;
  setNotation: (v: NotationMode) => void;
}

function Chip({ label, selected, onClick, disabled, toggle }: { label: string; selected: boolean; onClick: () => void; disabled?: boolean; toggle?: boolean }) {
  const handleClick = () => {
    if (selected && !toggle) return; // Don't click if already selected (non-toggle)
    playClickSound(); haptic.tap(); onClick();
  };
  return (
    <button
      className={`chip ${selected ? (toggle ? 'chip-toggle-active' : 'chip-active') : ''} ${disabled ? 'chip-disabled' : ''} ${toggle ? 'chip-toggle' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export default function Settings(p: Props) {
  const strings = ['1(E)', '2(B)', '3(G)', '4(D)', '5(A)', '6(E)'];
  const isMulti = p.multiStrings.length > 0;

  const toggleMultiString = (i: number) => {
    const s = i + 1;
    if (p.multiStrings.includes(s)) {
      if (p.multiStrings.length === 1) return;
      p.setMultiStrings(p.multiStrings.filter(x => x !== s));
    } else {
      p.setMultiStrings([...p.multiStrings, s]);
    }
  };

  return (
    <div className="settings">
      <div className="setting-group">
        <span className="group-title">String</span>
        <div className="setting-row">
          {strings.map((s, i) => (
            <Chip key={i} label={s}
              selected={isMulti ? p.multiStrings.includes(i + 1) : p.guitarString === i + 1}
              onClick={() => isMulti ? toggleMultiString(i) : p.setGuitarString(i + 1)}
              toggle={isMulti}
            />
          ))}
          <span style={{ width: 8 }} />
          <Chip label="Multi" selected={isMulti} toggle
            onClick={() => p.setMultiStrings(isMulti ? [] : [p.guitarString])}
          />
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
          <button className="adj-btn" onClick={() => { playClickSound(); p.setFretFrom(Math.max(0, p.fretFrom - 1)); }}>−</button>
          <span className="range-val">{p.fretFrom}</span>
          <button className="adj-btn" onClick={() => { playClickSound(); p.setFretFrom(Math.min(p.fretTo, p.fretFrom + 1)); }}>+</button>
          <span className="range-val">to</span>
          <button className="adj-btn" onClick={() => { playClickSound(); p.setFretTo(Math.max(p.fretFrom, p.fretTo - 1)); }}>−</button>
          <span className="range-val">{p.fretTo}</span>
          <button className="adj-btn" onClick={() => { playClickSound(); p.setFretTo(Math.min(21, p.fretTo + 1)); }}>+</button>
        </div>
      </div>
      <div className="setting-group">
        <span className="group-title">Question Type</span>
        <div className="setting-row">
          <Chip label="By Fret" selected={!p.byNote} onClick={() => p.setByNote(false)} />
          <Chip label="By Note" selected={p.byNote} onClick={() => p.setByNote(true)} />
        </div>
      </div>
      <div className="setting-group">
        <span className="group-title">{p.byNote ? 'Note Filter' : 'Filter'}</span>
        <div className="setting-row">
          <Chip label="Dots only" selected={p.dotsOnly} onClick={() => p.setDotsOnly(!p.dotsOnly)} toggle />
          <Chip label="Whole only" selected={p.wholeToneOnly} onClick={() => p.setWholeToneOnly(!p.wholeToneOnly)} toggle />
          <Chip label="♯ Sharps" selected={!p.wholeToneOnly && p.accidental === 'sharps'} onClick={() => p.setAccidental('sharps')} disabled={p.wholeToneOnly} />
          <Chip label="♭ Flats" selected={!p.wholeToneOnly && p.accidental === 'flats'} onClick={() => p.setAccidental('flats')} disabled={p.wholeToneOnly} />
        </div>
        {p.byNote && p.activeNotes.size > 0 && (
          <div className="setting-row" style={{ marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[...p.activeNotes].map(n => (
              <span key={n} className="note-preview-chip">{displayNote(n, p.accidental, p.notation)}</span>
            ))}
          </div>
        )}
      </div>
      {p.showOrderSwitcher && (
        <div className="setting-group">
          <span className="group-title">Circle Order</span>
          <div className="setting-row">
            <Chip label="By String" selected={p.byString} onClick={() => p.setByString(!p.byString)} toggle />
            <Chip label="Fifths" selected={p.order === 'fifths'} onClick={() => { if (p.order !== 'fifths') p.setOrder('fifths'); }} />
            <Chip label="Alpha" selected={p.order === 'alphabet'} onClick={() => { if (p.order !== 'alphabet') p.setOrder('alphabet'); }} />
          </div>
        </div>
      )}
      <div className="setting-group">
        <span className="group-title">Note Names</span>
        <div className="setting-row">
          <Chip label="A B C" selected={p.notation === 'alpha'} onClick={() => p.setNotation('alpha')} />
          <Chip label="Do Re Mi" selected={p.notation === 'solfege'} onClick={() => p.setNotation('solfege')} />
        </div>
      </div>
    </div>
  );
}
