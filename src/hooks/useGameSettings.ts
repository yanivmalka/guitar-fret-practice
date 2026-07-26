import { useState, useEffect, useCallback } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import { STAGES } from '../utils/stages';
import type { AccidentalMode, OrderMode, NotationMode } from '../utils/music';

export function useGameSettings() {
  const [stageIndex, setStageIndex] = useState(() => loadSetting('stageIndex', 0));
  const stage = STAGES[stageIndex];

  const [guitarString, setGuitarString] = useState(stage.string);
  const [time, setTime] = useState(stage.time);
  const [fretFrom, setFretFrom] = useState(stage.fretFrom);
  const [fretTo, setFretTo] = useState(stage.fretTo);
  const [accidental, setAccidental] = useState<AccidentalMode>(stage.accidental);
  const [order, setOrder] = useState<OrderMode>(stage.order);
  const [wholeToneOnly, setWholeToneOnly] = useState(stage.wholeToneOnly);
  const [dotsOnly, setDotsOnly] = useState(stage.dotsOnly);
  const [byString, setByString] = useState(true);
  const [byNote, setByNote] = useState(stage.byNote);
  const [multiStrings, setMultiStrings] = useState<number[]>(stage.multiStrings);
  const [notation, setNotation] = useState<NotationMode>(() => loadSetting<NotationMode>('notation', 'alpha'));
  useEffect(() => { saveSetting('notation', notation); }, [notation]);

  useEffect(() => { saveSetting('stageIndex', stageIndex); }, [stageIndex]);

  const applyStage = useCallback((idx: number) => {
    const s = STAGES[idx];
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
    setByString(true);
  }, []);

  const goToStage = useCallback((idx: number) => {
    if (idx < 0 || idx >= STAGES.length) return;
    setStageIndex(idx);
    applyStage(idx);
  }, [applyStage]);

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
  };
}
