import { useState } from 'react';
import type { AccidentalMode, OrderMode, NotationMode } from '../utils/music';
import { displayNote, wholeTones, alphaNotesSharp, alphaNotesFlat } from '../utils/music';
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
  selectedNotes: Set<string>;
  setSelectedNotes: (v: Set<string>) => void;
  isCustomized: boolean;
  customStageName: string;
  onRename: (name: string) => void;
  onClearCustom: () => void;
}

function Chip({ label, selected, onClick, disabled, toggle }: { label: string; selected: boolean; onClick: () => void; disabled?: boolean; toggle?: boolean }) {
  const handleClick = () => {
    if (selected && !toggle) return;
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
  const strings = [
    { num: 6, label: '6(E)' },
    { num: 5, label: '5(A)' },
    { num: 4, label: '4(D)' },
    { num: 3, label: '3(G)' },
    { num: 2, label: '2(B)' },
    { num: 1, label: '1(E)' },
  ];
  const isMulti = p.multiStrings.length > 0;

  const toggleMultiString = (s: number) => {
    if (p.multiStrings.includes(s)) {
      if (p.multiStrings.length === 1) return;
      p.setMultiStrings(p.multiStrings.filter(x => x !== s));
    } else {
      p.setMultiStrings([...p.multiStrings, s]);
    }
  };

  // Fret preset logic
  const isFretPreset012 = p.fretFrom === 0 && p.fretTo === 12;
  const isFretPreset1221 = p.fretFrom === 12 && p.fretTo === 21;
  const isFretCustom = !isFretPreset012 && !isFretPreset1221;
  const [showFretCustom, setShowFretCustom] = useState(isFretCustom);

  // All chromatic notes for the per-note toggler
  const allNotes = p.accidental === 'sharps' ? alphaNotesSharp : alphaNotesFlat;
  const wholeNoteSet = new Set(wholeTones);

  const toggleNote = (note: string) => {
    const next = new Set(p.selectedNotes);
    if (next.has(note)) {
      if (next.size <= 1) return; // keep at least one
      next.delete(note);
    } else {
      next.add(note);
    }
    p.setSelectedNotes(next);
  };

  // Renaming state for custom stage
  const [renaming, setRenaming] = useState(false);
  const [renameBuf, setRenameBuf] = useState(p.customStageName);

  return (
    <div className="settings">
      {/* ─── String ─────────────────────────────────────── */}
      <div className="setting-group">
        <span className="group-title">String</span>
        <div className="setting-row">
          {strings.map(s => (
            <Chip key={s.num} label={s.label}
              selected={isMulti ? p.multiStrings.includes(s.num) : p.guitarString === s.num}
              onClick={() => isMulti ? toggleMultiString(s.num) : p.setGuitarString(s.num)}
              toggle={isMulti}
            />
          ))}
          <span style={{ width: 8 }} />
          <Chip label="Multi" selected={isMulti} toggle
            onClick={() => p.setMultiStrings(isMulti ? [] : [p.guitarString])}
          />
        </div>
      </div>

      {/* ─── Frets ──────────────────────────────────────── */}
      <div className="setting-group">
        <span className="group-title">Frets</span>
        <div className="setting-row">
          <Chip label="0–12" selected={isFretPreset012 && !showFretCustom}
            onClick={() => { p.setFretFrom(0); p.setFretTo(12); setShowFretCustom(false); }} />
          <Chip label="12–21" selected={isFretPreset1221 && !showFretCustom}
            onClick={() => { p.setFretFrom(12); p.setFretTo(21); setShowFretCustom(false); }} />
          <Chip label="Custom" selected={showFretCustom} toggle
            onClick={() => setShowFretCustom(!showFretCustom)} />
        </div>
        {showFretCustom && (
          <div className="setting-row" style={{ marginTop: 8 }}>
            <button className="adj-btn" onClick={() => { playClickSound(); p.setFretFrom(Math.max(0, p.fretFrom - 1)); }}>−</button>
            <span className="range-val">{p.fretFrom}</span>
            <button className="adj-btn" onClick={() => { playClickSound(); p.setFretFrom(Math.min(p.fretTo, p.fretFrom + 1)); }}>+</button>
            <span className="range-val">to</span>
            <button className="adj-btn" onClick={() => { playClickSound(); p.setFretTo(Math.max(p.fretFrom, p.fretTo - 1)); }}>−</button>
            <span className="range-val">{p.fretTo}</span>
            <button className="adj-btn" onClick={() => { playClickSound(); p.setFretTo(Math.min(21, p.fretTo + 1)); }}>+</button>
          </div>
        )}
      </div>

      {/* ─── Question Type ──────────────────────────────── */}
      <div className="setting-group">
        <span className="group-title">Question Type</span>
        <div className="setting-row">
          <Chip label="By Fret" selected={!p.byNote} onClick={() => p.setByNote(false)} />
          <Chip label="By Note" selected={p.byNote} onClick={() => p.setByNote(true)} />
        </div>
      </div>

      {/* ─── Filter ─────────────────────────────────────── */}
      <div className="setting-group">
        <span className="group-title">Filter</span>
        <div className="setting-row">
          <Chip label="Whole Only" selected={p.wholeToneOnly} onClick={() => p.setWholeToneOnly(!p.wholeToneOnly)} toggle />
          <Chip label="Dot Frets" selected={p.dotsOnly} onClick={() => p.setDotsOnly(!p.dotsOnly)} toggle />
        </div>
        <div className="setting-row" style={{ marginTop: 6 }}>
          <Chip label="♯ Sharps" selected={!p.wholeToneOnly && p.accidental === 'sharps'} onClick={() => p.setAccidental('sharps')} disabled={p.wholeToneOnly} />
          <Chip label="♭ Flats" selected={!p.wholeToneOnly && p.accidental === 'flats'} onClick={() => p.setAccidental('flats')} disabled={p.wholeToneOnly} />
        </div>
      </div>

      {/* ─── Notes (By Note mode) ───────────────────────── */}
      {p.byNote && (
        <div className="setting-group">
          <span className="group-title">Notes</span>
          <div className="setting-row" style={{ flexWrap: 'wrap' }}>
            {allNotes.map(n => {
              const isWhole = wholeNoteSet.has(n.replace('#', '').replace('b', ''));
              const inActive = p.activeNotes.has(n);
              const isSelected = p.selectedNotes.has(n);
              return (
                <Chip key={n}
                  label={displayNote(n, p.accidental, p.notation)}
                  selected={isSelected}
                  onClick={() => toggleNote(n)}
                  toggle
                  disabled={!inActive || (p.wholeToneOnly && !isWhole)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Circle Order (By Fret mode) ────────────────── */}
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

      {/* ─── Time ───────────────────────────────────────── */}
      <div className="setting-group">
        <span className="group-title">Time</span>
        <div className="setting-row">
          {[3, 4, 5, 7, 10].map(t => <Chip key={t} label={`${t}s`} selected={p.time === t} onClick={() => p.setTime(t)} />)}
        </div>
      </div>

      {/* ─── Note Names ─────────────────────────────────── */}
      <div className="setting-group">
        <span className="group-title">Note Names</span>
        <div className="setting-row">
          <Chip label="A B C" selected={p.notation === 'alpha'} onClick={() => p.setNotation('alpha')} />
          <Chip label="Do Re Mi" selected={p.notation === 'solfege'} onClick={() => p.setNotation('solfege')} />
        </div>
      </div>

      {/* ─── Separator ──────────────────────────────────── */}
      <div className="setting-separator" />

      {/* ─── Custom Stage Section ───────────────────────── */}
      {p.isCustomized && (
        <div className="custom-stage-section">
          <span className="group-title">Custom Stage</span>
          <div className="custom-stage-name">
            {!renaming ? (
              <>
                <span>✎ {p.customStageName || 'Untitled'}</span>
                <button className="custom-action-btn" onClick={() => { setRenameBuf(p.customStageName); setRenaming(true); }}>Rename</button>
                <button className="custom-action-btn custom-action-btn-danger" onClick={p.onClearCustom}>↺ Reset</button>
              </>
            ) : (
              <>
                <input className="custom-name-input" value={renameBuf} onChange={e => setRenameBuf(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { p.onRename(renameBuf); setRenaming(false); } }}
                  autoFocus />
                <button className="custom-action-btn" onClick={() => { p.onRename(renameBuf); setRenaming(false); }}>✓</button>
                <button className="custom-action-btn" onClick={() => setRenaming(false)}>✕</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
