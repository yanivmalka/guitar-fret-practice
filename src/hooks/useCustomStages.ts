import { useState } from 'react';
import { loadSetting, saveSetting } from '../utils/settings';
import type { Stage } from '../utils/stages';
import type { AccidentalMode, OrderMode } from '../utils/music';

export interface CustomStage {
  name: string;
  guitarString: number;
  fretFrom: number;
  fretTo: number;
  dotsOnly: boolean;
  wholeToneOnly: boolean;
  byNote: boolean;
  multiStrings: number[];
  time: number;
  accidental: AccidentalMode;
  order: OrderMode;
}

const MAX_FREE_CUSTOM = 1;

export function useCustomStages() {
  const [stages, setStages] = useState<CustomStage[]>(() =>
    loadSetting<CustomStage[]>('customStages', [])
  );

  const save = (stage: CustomStage): boolean => {
    if (stages.length >= MAX_FREE_CUSTOM) return false; // limit reached
    const updated = [...stages, stage];
    setStages(updated);
    saveSetting('customStages', updated);
    return true;
  };

  const remove = (index: number) => {
    const updated = stages.filter((_, i) => i !== index);
    setStages(updated);
    saveSetting('customStages', updated);
  };

  const canSaveMore = stages.length < MAX_FREE_CUSTOM;

  // Convert to Stage objects for the nav system
  const toStageObjects = (startId: number): Stage[] => {
    return stages.map((cs, i) => ({
      id: startId + i,
      label: `★ ${cs.name}`,
      title: cs.name,
      shortDesc: `Custom: ${cs.byNote ? 'By Note' : 'By Fret'} · Frets ${cs.fretFrom}–${cs.fretTo}`,
      description: `Your custom stage "${cs.name}". String ${cs.guitarString}, frets ${cs.fretFrom}–${cs.fretTo}.`,
      string: cs.guitarString,
      multiStrings: cs.multiStrings,
      fretFrom: cs.fretFrom,
      fretTo: cs.fretTo,
      dotsOnly: cs.dotsOnly,
      wholeToneOnly: cs.wholeToneOnly,
      byNote: cs.byNote,
      order: cs.order,
      accidental: cs.accidental,
      time: cs.time,
      maxQuestions: 25,
      group: 'My Stages',
    }));
  };

  return { stages, save, remove, canSaveMore, toStageObjects };
}
