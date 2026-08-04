import type { AccidentalMode, OrderMode } from './music';

export interface Stage {
  id: number;
  label: string;
  title: string;
  shortDesc: string;
  description: string;
  string: number;
  multiStrings: number[];
  fretFrom: number;
  fretTo: number;
  dotsOnly: boolean;
  wholeToneOnly: boolean;
  byNote: boolean;
  order: OrderMode;
  accidental: AccidentalMode;
  time: number;
  maxQuestions: number;
  group: string;   // e.g. "String 6 · Frets 0–12"
}

const STRING_NAMES: Record<number, string> = {
  1: '1 (high E)', 2: '2 (B)', 3: '3 (G)',
  4: '4 (D)', 5: '5 (A)', 6: '6 (low E)',
};

const CONFIGS = [
  {
    dotsOnly: true, wholeToneOnly: false, byNote: false,
    titleSuffix: 'Anchor Frets',
    short: (f: number, t: number) => `🎯 Dot frets ${f}–${t} · See fret → name the note`,
    desc: (str: number, f: number, _t: number) =>
      `Dot frets (${f === 0 ? '0, 3, 5, 7, 9, 12' : '12, 15, 17, 19, 21'}) on string ${STRING_NAMES[str]}. Landmark anchors for this range.`,
  },
  {
    dotsOnly: true, wholeToneOnly: false, byNote: true,
    titleSuffix: 'Anchor Recall',
    short: (f: number, t: number) => `🎯 Dot frets ${f}–${t} · See note → find the fret`,
    desc: (str: number, f: number, _t: number) =>
      `Dot frets (${f === 0 ? '0–12' : '12–21'}) on string ${STRING_NAMES[str]}. Active recall: see the note, find the fret.`,
  },
  {
    dotsOnly: false, wholeToneOnly: true, byNote: false,
    titleSuffix: 'Natural Notes',
    short: (f: number, t: number) => `🎵 Natural notes ${f}–${t} · See fret → name the note`,
    desc: (str: number, f: number, t: number) =>
      `Natural notes (A B C D E F G) on string ${STRING_NAMES[str]}, frets ${f}–${t}.`,
  },
  {
    dotsOnly: false, wholeToneOnly: true, byNote: true,
    titleSuffix: 'Natural Recall',
    short: (f: number, t: number) => `🎵 Natural notes ${f}–${t} · See note → find the fret`,
    desc: (str: number, f: number, t: number) =>
      `Natural notes on string ${STRING_NAMES[str]}, frets ${f}–${t}. See the note, find every fret.`,
  },
  {
    dotsOnly: false, wholeToneOnly: false, byNote: false,
    titleSuffix: 'Full Chromatic',
    short: (f: number, t: number) => `🎸 All 12 notes ${f}–${t} · See fret → name the note`,
    desc: (str: number, f: number, t: number) =>
      `Full chromatic on string ${STRING_NAMES[str]}, frets ${f}–${t}. Every note is fair game.`,
  },
  {
    dotsOnly: false, wholeToneOnly: false, byNote: true,
    titleSuffix: 'Full Recall',
    short: (f: number, t: number) => `🎸 All 12 notes ${f}–${t} · See note → find the fret`,
    desc: (str: number, f: number, t: number) =>
      `Complete mastery of string ${STRING_NAMES[str]}, frets ${f}–${t}. See any note — find every fret.`,
  },
];

function makeStagesForString(str: number, fretFrom: number, fretTo: number): Stage[] {
  const rangeLabel = `${fretFrom}–${fretTo}`;
  const time = fretFrom === 0 ? (str >= 5 ? 7 : str >= 3 ? 6 : 5) : (str >= 5 ? 6 : 5);
  return CONFIGS.map(c => ({
    id: 0,
    label: '',
    title: `String ${str} · ${c.titleSuffix}`,
    shortDesc: c.short(fretFrom, fretTo),
    description: c.desc(str, fretFrom, fretTo),
    string: str,
    multiStrings: [],
    fretFrom,
    fretTo,
    dotsOnly: c.dotsOnly,
    wholeToneOnly: c.wholeToneOnly,
    byNote: c.byNote,
    order: 'alphabet' as OrderMode,
    accidental: 'sharps' as AccidentalMode,
    time,
    maxQuestions: c.dotsOnly ? 15 : c.wholeToneOnly ? 20 : 25,
    group: `String ${str} · Frets ${rangeLabel}`,
  }));
}

function makePairStage(strA: number, strB: number, byNote: boolean, fretFrom: number, fretTo: number): Stage {
  const rangeLabel = `${fretFrom}–${fretTo}`;
  return {
    id: 0, label: '',
    title: `Strings ${strA}+${strB} · ${byNote ? 'Recall' : 'Name'}`,
    shortDesc: `${byNote ? '🎵 See note → find fret' : '🎸 See fret → name the note'} · Strings ${strA} & ${strB} · ${rangeLabel}`,
    description: `All notes on strings ${STRING_NAMES[strA]} and ${STRING_NAMES[strB]}, frets ${rangeLabel}. Random string each question.`,
    string: strA,
    multiStrings: [strA, strB],
    fretFrom, fretTo,
    dotsOnly: false, wholeToneOnly: false, byNote,
    order: 'alphabet', accidental: 'sharps',
    time: 5, maxQuestions: 30,
    group: `Strings ${strA}+${strB} · Frets ${rangeLabel}`,
  };
}

// One "level" block: str6 → str5, str4 → str3, str2 → str1 (no pair stages here — pairs are separate)
function makeLevel(fretFrom: number, fretTo: number): Stage[] {
  const stages: Stage[] = [];
  const rangeLabel = `${fretFrom}–${fretTo}`;
  const strings: number[] = [6, 5, 4, 3, 2, 1];
  strings.forEach(str => {
    const group = `String ${str} · Frets ${rangeLabel}`;
    makeStagesForString(str, fretFrom, fretTo).forEach(s => stages.push({ ...s, group }));
  });
  return stages;
}

function buildAllStages(): Stage[] {
  // Single-string stages: 6 strings × 2 fret ranges × 6 configs each
  const singleString: Stage[] = [
    ...makeLevel(0, 12),
    ...makeLevel(12, 21),
  ];

  // Multi-string pair stages (moved before Full Neck) — grouped as "Multi-String" class
  const multiGroup = 'Multi-String · All Pairs';
  const pairStages: Stage[] = [];
  const fretRanges: [number, number][] = [[0, 12], [12, 21]];
  fretRanges.forEach(([f, t]) => {
    const triplets: [number, number][] = [[6, 5], [4, 3], [2, 1]];
    triplets.forEach(([a, b]) => {
      pairStages.push({ ...makePairStage(a, b, false, f, t), group: multiGroup });
      pairStages.push({ ...makePairStage(a, b, true,  f, t), group: multiGroup });
    });
  });

  // Final: all strings full neck
  const fullNeckGroup = 'All Strings · Full Neck';
  const fullNeck: Stage[] = [
    {
      id: 0, label: '', group: fullNeckGroup,
      title: 'All Strings · By Fret',
      shortDesc: '🎸 All 6 strings · Frets 0–21 · See fret → name the note',
      description: 'All 6 strings, full neck frets 0–21. Random string every question. Expert territory.',
      string: 6, multiStrings: [1,2,3,4,5,6],
      fretFrom: 0, fretTo: 21,
      dotsOnly: false, wholeToneOnly: false, byNote: false,
      order: 'alphabet', accidental: 'sharps', time: 4, maxQuestions: 30,
    },
    {
      id: 0, label: '', group: fullNeckGroup,
      title: 'All Strings · By Note',
      shortDesc: '🎸 All 6 strings · Frets 0–21 · See note → find the fret',
      description: 'All 6 strings, all 12 notes, full neck frets 0–21. See a note — find every fret on any string. No shortcuts left.',
      string: 6, multiStrings: [1,2,3,4,5,6],
      fretFrom: 0, fretTo: 21,
      dotsOnly: false, wholeToneOnly: false, byNote: true,
      order: 'alphabet', accidental: 'sharps', time: 3, maxQuestions: 30,
    },
  ];

  const all = [...singleString, ...pairStages, ...fullNeck];
  all.forEach((s, i) => { s.id = i + 1; s.label = `Stage ${i + 1}`; });
  return all;
}

export const STAGES: Stage[] = buildAllStages();
export const TOTAL_STAGES = STAGES.length;

// Groups in order, with the stage indices that belong to each
export interface StageGroup { label: string; indices: number[] }
export function getStageGroups(): StageGroup[] {
  const map = new Map<string, number[]>();
  STAGES.forEach((s, i) => {
    if (!map.has(s.group)) map.set(s.group, []);
    map.get(s.group)!.push(i);
  });
  return Array.from(map.entries()).map(([label, indices]) => ({ label, indices }));
}

// 7 classes × 2 parts = levels. Part = fret range (0-12 or 12-21)
export interface StageLevel { label: string; stageIndices: number[] }
export interface StagePart  { label: string; classIndices: number[] }

export function getStageLevels(): StageLevel[] {
  const levels: StageLevel[] = [];

  // Single-string levels: each string × each fret range
  [6, 5, 4, 3, 2, 1].forEach(str => {
    [[0, 12], [12, 21]].forEach(([f, t]) => {
      levels.push({
        label: `Str ${str} · ${f}–${t}`,
        stageIndices: STAGES.map((s, i) =>
          s.multiStrings.length === 0 && s.string === str && s.fretFrom === f && s.fretTo === t ? i : -1
        ).filter(i => i !== -1),
      });
    });
  });

  // Multi-string level — all pair stages together as one level
  levels.push({
    label: 'Multi-String',
    stageIndices: STAGES.map((s, i) =>
      s.multiStrings.length === 2 ? i : -1
    ).filter(i => i !== -1),
  });

  // Full Neck level
  levels.push({
    label: 'Full Neck',
    stageIndices: STAGES.map((s, i) =>
      s.multiStrings.length === 6 ? i : -1
    ).filter(i => i !== -1),
  });

  return levels;
}

export function getStageClasses(): { label: string; levelIndices: number[] }[] {
  const levels = getStageLevels();
  // Classes: one per string + Multi-String + Full Neck
  return [
    { label: 'Str 6', levelIndices: levels.map((lv, i) => lv.label.startsWith('Str 6') ? i : -1).filter(i => i !== -1) },
    { label: 'Str 5', levelIndices: levels.map((lv, i) => lv.label.startsWith('Str 5') ? i : -1).filter(i => i !== -1) },
    { label: 'Str 4', levelIndices: levels.map((lv, i) => lv.label.startsWith('Str 4') ? i : -1).filter(i => i !== -1) },
    { label: 'Str 3', levelIndices: levels.map((lv, i) => lv.label.startsWith('Str 3') ? i : -1).filter(i => i !== -1) },
    { label: 'Str 2', levelIndices: levels.map((lv, i) => lv.label.startsWith('Str 2') ? i : -1).filter(i => i !== -1) },
    { label: 'Str 1', levelIndices: levels.map((lv, i) => lv.label.startsWith('Str 1') ? i : -1).filter(i => i !== -1) },
    { label: 'Multi',     levelIndices: levels.map((lv, i) => lv.label === 'Multi-String' ? i : -1).filter(i => i !== -1) },
    { label: 'Full Neck', levelIndices: levels.map((lv, i) => lv.label === 'Full Neck' ? i : -1).filter(i => i !== -1) },
  ];
}

export function getStageParts(): StagePart[] {
  const levels = getStageLevels();
  return [
    { label: 'Frets 0–12',  classIndices: levels.map((lv, i) => lv.label.includes('0–12')       ? i : -1).filter(i => i !== -1) },
    { label: 'Frets 12–21', classIndices: levels.map((lv, i) => lv.label.includes('12–21')      ? i : -1).filter(i => i !== -1) },
    { label: 'Advanced',    classIndices: levels.map((lv, i) => (lv.label === 'Multi-String' || lv.label === 'Full Neck') ? i : -1).filter(i => i !== -1) },
  ];
}
