import { useState, useEffect, useCallback } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import { STAGES } from '../utils/stages';
import type { AccidentalMode, OrderMode, NotationMode } from '../utils/music';

export function useGameSettings() {
  const [stageIndex, setStageIndex] = useState(() => loadSetting('stageIndex', 0));
  const stage = STAGES[stageIndex];

  // Each setting is individually persisted so user preferences survive stage changes and reopens
  const [guitarString, setGuitarStringRaw] = useState(() => loadSetting('pref_guitarString', stage.string));
  const [time,         setTimeRaw]         = useState(() => loadSetting('pref_time',         stage.time));
  const [fretFrom,     setFretFromRaw]      = useState(() => loadSetting('pref_fretFrom',     stage.fretFrom));
  const [fretTo,       setFretToRaw]        = useState(() => loadSetting('pref_fretTo',       stage.fretTo));
  const [accidental,   setAccidentalRaw]    = useState<AccidentalMode>(() => loadSetting('pref_accidental', stage.accidental));
  const [order,        setOrderRaw]         = useState<OrderMode>(() => loadSetting('pref_order', stage.order));
  const [wholeToneOnly, setWholeToneOnlyRaw] = useState(() => loadSetting('pref_wholeToneOnly', stage.wholeToneOnly));
  const [dotsOnly,     setDotsOnlyRaw]      = useState(() => loadSetting('pref_dotsOnly',     stage.dotsOnly));
  const [byString,     setByStringRaw]      = useState(() => loadSetting('pref_byString',     true));
  const [byNote,       setByNoteRaw]        = useState(() => loadSetting('pref_byNote',       stage.byNote));
  const [multiStrings, setMultiStringsRaw]  = useState<number[]>(() => loadSetting('pref_multiStrings', stage.multiStrings));
  const [notation,     setNotationRaw]      = useState<NotationMode>(() => loadSetting('pref_notation', 'alpha' as NotationMode));

  // Persist every setting change
  const setGuitarString = (v: number)        => { setGuitarStringRaw(v);  saveSetting('pref_guitarString',  v); };
  const setTime         = (v: number)        => { setTimeRaw(v);          saveSetting('pref_time',          v); };
  const setFretFrom     = (v: number)        => { setFretFromRaw(v);      saveSetting('pref_fretFrom',      v); };
  const setFretTo       = (v: number)        => { setFretToRaw(v);        saveSetting('pref_fretTo',        v); };
  const setAccidental   = (v: AccidentalMode)=> { setAccidentalRaw(v);   saveSetting('pref_accidental',   v); };
  const setOrder        = (v: OrderMode)     => { setOrderRaw(v);         saveSetting('pref_order',         v); };
  const setWholeToneOnly= (v: boolean)       => { setWholeToneOnlyRaw(v); saveSetting('pref_wholeToneOnly', v); };
  const setDotsOnly     = (v: boolean)       => { setDotsOnlyRaw(v);      saveSetting('pref_dotsOnly',      v); };
  const setByString     = (v: boolean)       => { setByStringRaw(v);      saveSetting('pref_byString',      v); };
  const setByNote       = (v: boolean)       => { setByNoteRaw(v);        saveSetting('pref_byNote',        v); };
  const setMultiStrings = (v: number[])      => { setMultiStringsRaw(v);  saveSetting('pref_multiStrings',  v); };
  const setNotation     = (v: NotationMode)  => { setNotationRaw(v);      saveSetting('pref_notation',      v); };

  useEffect(() => { saveSetting('stageIndex', stageIndex); }, [stageIndex]);

  // applyStage: applies ALL stage settings including fret range
  // This ensures navigation always lands on the correct stage without syncStageToSettings snapping back
  const applyStage = useCallback((idx: number) => {
    const s = STAGES[idx];
    setGuitarString(s.string);
    setFretFrom(s.fretFrom);
    setFretTo(s.fretTo);
    setTime(s.time);
    setAccidental(s.accidental);
    setOrder(s.order);
    setWholeToneOnly(s.wholeToneOnly);
    setDotsOnly(s.dotsOnly);
    setByNote(s.byNote);
    setMultiStrings(s.multiStrings);
    setByStringRaw(true); saveSetting('pref_byString', true);
  }, []);

  // ── Custom stage snapshot ──────────────────────────────────────
  const [hasCustomSnapshot, setHasCustomSnapshot] = useState(() => localStorage.getItem('customStageSnapshot') !== null);

  const saveCustomSnapshot = useCallback(() => {
    const snapshot = { guitarString, fretFrom, fretTo, dotsOnly, wholeToneOnly, byNote, multiStrings, time, accidental, order };
    saveSetting('customStageSnapshot', snapshot);
    setHasCustomSnapshot(true);
  }, [guitarString, fretFrom, fretTo, dotsOnly, wholeToneOnly, byNote, multiStrings, time, accidental, order]);

  const restoreCustomSnapshot = useCallback((): boolean => {
    const raw = localStorage.getItem('customStageSnapshot');
    if (!raw) return false;
    try {
      const s = JSON.parse(raw);
      setGuitarString(s.guitarString);
      setTime(s.time);
      setFretFrom(s.fretFrom);
      setFretTo(s.fretTo);
      setAccidental(s.accidental);
      setOrder(s.order);
      setWholeToneOnly(s.wholeToneOnly);
      setDotsOnly(s.dotsOnly);
      setByNote(s.byNote);
      setMultiStrings(s.multiStrings);
      return true;
    } catch { return false; }
  }, []);

  const clearCustomSnapshot = useCallback(() => {
    localStorage.removeItem('customStageSnapshot');
    setHasCustomSnapshot(false);
  }, []);

  const goToStage = useCallback((idx: number) => {
    if (idx < 0 || idx >= STAGES.length) return;
    // Save custom settings before navigating away (check inline to avoid forward-ref)
    const currentMatch = STAGES.findIndex(s =>
      s.string === guitarString &&
      s.dotsOnly === dotsOnly &&
      s.wholeToneOnly === wholeToneOnly &&
      s.byNote === byNote &&
      s.fretFrom === fretFrom &&
      s.fretTo === fretTo &&
      JSON.stringify([...s.multiStrings].sort()) === JSON.stringify([...multiStrings].sort())
    );
    if (currentMatch < 0) saveCustomSnapshot();
    setStageIndex(idx);
    applyStage(idx);
  }, [applyStage, saveCustomSnapshot, guitarString, dotsOnly, wholeToneOnly, byNote, fretFrom, fretTo, multiStrings]);

  // When user changes settings, try to find a matching built-in stage
  const findMatchingStage = useCallback((opts: {
    string: number; dotsOnly: boolean; wholeToneOnly: boolean; byNote: boolean;
    multiStrings: number[]; fretFrom: number; fretTo: number;
  }): number => {
    return STAGES.findIndex(s =>
      s.string === opts.string &&
      s.dotsOnly === opts.dotsOnly &&
      s.wholeToneOnly === opts.wholeToneOnly &&
      s.byNote === opts.byNote &&
      s.fretFrom === opts.fretFrom &&
      s.fretTo === opts.fretTo &&
      JSON.stringify([...s.multiStrings].sort()) === JSON.stringify([...opts.multiStrings].sort())
    );
  }, []);

  // Attempt to sync stage index when settings change
  const syncStageToSettings = useCallback(() => {
    const match = findMatchingStage({
      string: guitarString, dotsOnly, wholeToneOnly, byNote, multiStrings, fretFrom, fretTo,
    });
    if (match >= 0 && match !== stageIndex) {
      setStageIndex(match);
      saveSetting('stageIndex', match);
    }
  }, [guitarString, dotsOnly, wholeToneOnly, byNote, multiStrings, fretFrom, fretTo, stageIndex, findMatchingStage]);

  // Auto-sync when settings change (debounced via useEffect)
  useEffect(() => { syncStageToSettings(); }, [syncStageToSettings]);

  // After sync, determine if we're still customized (no built-in stage matches)
  const matchedIdx = findMatchingStage({
    string: guitarString, dotsOnly, wholeToneOnly, byNote, multiStrings, fretFrom, fretTo,
  });
  const isCustomized = matchedIdx < 0;

  // Reset restores ALL settings including fret range to stage defaults
  const resetToStage = useCallback(() => {
    const s = STAGES[stageIndex];
    setGuitarString(s.string);
    setTime(s.time);
    setFretFrom(s.fretFrom);
    setFretTo(s.fretTo);
    setAccidental(s.accidental);
    setOrder(s.order);
    setWholeToneOnly(s.wholeToneOnly);
    setDotsOnly(s.dotsOnly);
    setByNote(s.byNote);
    setMultiStrings(s.multiStrings);
    setByStringRaw(true); saveSetting('pref_byString', true);
    // Clear custom stage data
    clearCustomSnapshot();
    saveSetting('customStageName', '');
  }, [stageIndex, clearCustomSnapshot]);

  return {
    stageIndex, setStageIndex,
    stage,
    guitarString, setGuitarString,
    time, setTime,
    fretFrom, setFretFrom,
    fretTo, setFretTo,
    accidental, setAccidental,
    order, setOrder,
    wholeToneOnly, setWholeToneOnly,
    dotsOnly, setDotsOnly,
    byString, setByString,
    byNote, setByNote,
    multiStrings, setMultiStrings,
    notation, setNotation,
    applyStage,
    goToStage,
    isCustomized,
    resetToStage,
    restoreCustomSnapshot,
    hasCustomSnapshot,
    clearCustomSnapshot,
  };
}
