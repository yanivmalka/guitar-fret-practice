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

// One "level" block: str6 → str5 → 6+5, str4 → str3 → 4+3, str2 → str1 → 2+1
function makeLevel(fretFrom: number, fretTo: number): Stage[] {
  const stages: Stage[] = [];
  const rangeLabel = `${fretFrom}–${fretTo}`;
  const triplets: [number, number][] = [[6, 5], [4, 3], [2, 1]];
  triplets.forEach(([a, b]) => {
    stages.push(...makeStagesForString(a, fretFrom, fretTo));
    stages.push(...makeStagesForString(b, fretFrom, fretTo));
    // pair gets its own group
    const pairGroup = `Strings ${a}+${b} · Frets ${rangeLabel}`;
    stages.push({ ...makePairStage(a, b, false, fretFrom, fretTo), group: pairGroup });
    stages.push({ ...makePairStage(a, b, true,  fretFrom, fretTo), group: pairGroup });
  });
  return stages;
}

function buildAllStages(): Stage[] {
  const all: Stage[] = [
    ...makeLevel(0, 12),
    ...makeLevel(12, 21),
    // Final: all strings full neck
    {
      id: 0, label: '', group: 'All Strings · Full Neck',
      title: 'All Strings · By Fret',
      shortDesc: '🎸 All 6 strings · Frets 0–21 · See fret → name the note',
      description: 'All 6 strings, full neck frets 0–21. Random string every question. Expert territory.',
      string: 6, multiStrings: [1,2,3,4,5,6],
      fretFrom: 0, fretTo: 21,
      dotsOnly: false, wholeToneOnly: false, byNote: false,
      order: 'alphabet', accidental: 'sharps', time: 4, maxQuestions: 30,
    },
    {
      id: 0, label: '', group: 'All Strings · Full Neck',
      title: 'All Strings · By Note',
      shortDesc: '🎸 All 6 strings · Frets 0–21 · See note → find the fret',
      description: 'All 6 strings, all 12 notes, full neck frets 0–21. See a note — find every fret on any string. No shortcuts left.',
      string: 6, multiStrings: [1,2,3,4,5,6],
      fretFrom: 0, fretTo: 21,
      dotsOnly: false, wholeToneOnly: false, byNote: true,
      order: 'alphabet', accidental: 'sharps', time: 3, maxQuestions: 30,
    },
  ];

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
  const classes: { label: string; match: (s: Stage) => boolean }[] = [
    { label: 'Str 6+5',   match: s => s.multiStrings.length===0 && (s.string===6||s.string===5) },
    { label: '6+5',       match: s => s.multiStrings.length===2 && s.multiStrings.includes(6) },
    { label: 'Str 4+3',   match: s => s.multiStrings.length===0 && (s.string===4||s.string===3) },
    { label: '4+3',       match: s => s.multiStrings.length===2 && s.multiStrings.includes(4) },
    { label: 'Str 2+1',   match: s => s.multiStrings.length===0 && (s.string===2||s.string===1) },
    { label: '2+1',       match: s => s.multiStrings.length===2 && s.multiStrings.includes(2) },
    { label: 'Full Neck', match: s => s.multiStrings.length===6 },
  ];
  // For each class, split into part1 (0-12) and part2 (12-21), full neck is one level
  const levels: StageLevel[] = [];
  classes.forEach(c => {
    if (c.label === 'Full Neck') {
      levels.push({ label: 'Full Neck', stageIndices: STAGES.map((s,i) => c.match(s) ? i : -1).filter(i=>i!==-1) });
    } else {
      ['0–12','12–21'].forEach(part => {
        const from = part === '0–12' ? 0 : 12;
        const to   = part === '0–12' ? 12 : 21;
        levels.push({
          label: `${c.label} · ${part}`,
          stageIndices: STAGES.map((s,i) => c.match(s) && s.fretFrom===from && s.fretTo===to ? i : -1).filter(i=>i!==-1),
        });
      });
    }
  });
  return levels;
}

// 7 classes (dashes) — each contains its part1 + part2 level indices
export function getStageClasses(): { label: string; levelIndices: number[] }[] {
  const levels = getStageLevels();
  const classLabels = ['Str 6+5','6+5','Str 4+3','4+3','Str 2+1','2+1','Full Neck'];
  return classLabels.map(cl => ({
    label: cl,
    levelIndices: levels.map((lv,i) => lv.label.startsWith(cl) ? i : -1).filter(i=>i!==-1),
  }));
}

// 2 parts
export function getStageParts(): StagePart[] {
  const levels = getStageLevels();
  return [
    { label: 'Part 1 · 0–12',  classIndices: levels.map((lv,i) => lv.label.includes('0–12')  ? i : -1).filter(i=>i!==-1) },
    { label: 'Part 2 · 12–21', classIndices: levels.map((lv,i) => lv.label.includes('12–21') ? i : -1).filter(i=>i!==-1) },
    { label: 'Full Neck',       classIndices: levels.map((lv,i) => lv.label === 'Full Neck'  ? i : -1).filter(i=>i!==-1) },
  ];
}
