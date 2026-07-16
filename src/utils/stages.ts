import type { AccidentalMode, OrderMode } from './music';

export interface Stage {
  id: number;
  label: string;           // e.g. "Stage 1"
  title: string;           // short name
  shortDesc: string;       // one-liner shown by default
  description: string;     // full explanation behind "show more"
  string: number;          // 1–6
  multiStrings: number[];  // empty = single string mode
  fretFrom: number;
  fretTo: number;
  dotsOnly: boolean;
  wholeToneOnly: boolean;
  byNote: boolean;
  order: OrderMode;
  accidental: AccidentalMode;
  time: number;           // seconds per question
  maxQuestions: number;   // questions per session for this stage
}

const STRING_NAMES: Record<number, string> = {
  1: '1 (high E)', 2: '2 (B)', 3: '3 (G)',
  4: '4 (D)', 5: '5 (A)', 6: '6 (low E)',
};

function makeStagesForString(str: number): Stage[] {
  const sName = STRING_NAMES[str];
  const stages: Stage[] = [];
  const id = (6 - str) * 6 + 1;

  const configs: Array<{
    dotsOnly: boolean; wholeToneOnly: boolean; byNote: boolean;
    title: string; short: string; desc: string;
  }> = [
    {
      dotsOnly: true, wholeToneOnly: false, byNote: false,
      title: `String ${str} · Anchor Frets`,
      short: `🎯 Dot frets · See fret → name the note`,
      desc: `Dot frets only (0, 3, 5, 7, 9, 12) on string ${sName}. These landmark positions are your mental anchors for the whole string. See the fret number, pick the note on the circle.`,
    },
    {
      dotsOnly: true, wholeToneOnly: false, byNote: true,
      title: `String ${str} · Anchor Recall`,
      short: `🎯 Dot frets · See note → find the fret`,
      desc: `Dot frets only (0, 3, 5, 7, 9, 12) on string ${sName}. Active recall: see the note name, find it on the fret grid. Forces you to own those anchor positions.`,
    },
    {
      dotsOnly: false, wholeToneOnly: true, byNote: false,
      title: `String ${str} · Natural Notes`,
      short: `🎵 Natural notes · See fret → name the note`,
      desc: `All natural notes (A B C D E F G, no sharps/flats) on string ${sName}. Fill the gaps between anchors. Use fret 3, 5, 7 etc. as stepping stones to find the in-between notes.`,
    },
    {
      dotsOnly: false, wholeToneOnly: true, byNote: true,
      title: `String ${str} · Natural Recall`,
      short: `🎵 Natural notes · See note → find the fret`,
      desc: `All natural notes on string ${sName}. See the note name, find every fret it lives on. Navigate by reasoning from your known anchor positions.`,
    },
    {
      dotsOnly: false, wholeToneOnly: false, byNote: false,
      title: `String ${str} · Full Chromatic`,
      short: `🎸 All 12 notes · See fret → name the note`,
      desc: `Full chromatic — all 12 notes including sharps on string ${sName}. Every fret 0–12 is fair game. The natural notes you know become reference points for the accidentals next to them.`,
    },
    {
      dotsOnly: false, wholeToneOnly: false, byNote: true,
      title: `String ${str} · Full Recall`,
      short: `🎸 All 12 notes · See note → find the fret`,
      desc: `Complete mastery of string ${sName}. See any note name — find every fret it appears on, 0–12. This is the final test for this string before moving on.`,
    },
  ];

  configs.forEach((c, i) => {
    stages.push({
      id: id + i,
      label: `Stage ${id + i}`,
      title: c.title,
      shortDesc: c.short,
      description: c.desc,
      string: str,
      multiStrings: [],
      fretFrom: 0,
      fretTo: 12,
      dotsOnly: c.dotsOnly,
      wholeToneOnly: c.wholeToneOnly,
      byNote: c.byNote,
      order: 'alphabet',
      accidental: 'sharps',
      time: str >= 5 ? 7 : str >= 3 ? 6 : 5,
      maxQuestions: c.dotsOnly ? 15 : c.wholeToneOnly ? 20 : 25,
    });
  });

  return stages;
}

function makePairStage(strA: number, strB: number, byNote: boolean, stageId: number): Stage {
  return {
    id: stageId,
    label: `Stage ${stageId}`,
    title: `Strings ${strA}+${strB} · ${byNote ? 'Recall' : 'Name'}`,
    shortDesc: `${byNote ? '🎵 See note → find fret' : '🎸 See fret → name the note'} · Strings ${strA} & ${strB}`,
    description: `All notes on strings ${STRING_NAMES[strA]} and ${STRING_NAMES[strB]}. A random string is chosen each question — you must know both cold. Frets 0–12.`,
    string: strA,
    multiStrings: [strA, strB],
    fretFrom: 0,
    fretTo: 12,
    dotsOnly: false,
    wholeToneOnly: false,
    byNote,
    order: 'alphabet',
    accidental: 'sharps',
    time: 5,
    maxQuestions: 30,
  };
}

function buildAllStages(): Stage[] {
  const all: Stage[] = [];

  [6, 5, 4, 3, 2, 1].forEach(str => {
    all.push(...makeStagesForString(str));
  });

  // Re-number sequentially
  all.forEach((s, i) => {
    s.id = i + 1;
    s.label = `Stage ${i + 1}`;
  });

  const pairs: Array<[number, number]> = [[6,5],[5,4],[4,3],[3,2],[2,1]];
  let nextId = all.length + 1;
  const pairStages: Stage[] = [];
  pairs.forEach(([a, b]) => {
    pairStages.push(makePairStage(a, b, false, nextId++));
    pairStages.push(makePairStage(a, b, true, nextId++));
  });

  const expertId = nextId;
  const expertStages: Stage[] = [
    {
      id: expertId,
      label: `Stage ${expertId}`,
      title: 'All Strings · Frets 0–17',
      shortDesc: '🎸 All 6 strings · Frets 0–17 · By fret',
      description: 'All 6 strings, all 12 notes, frets 0–17. A random string every question. You need to know the full upper neck now. Expert territory.',
      string: 6,
      multiStrings: [1,2,3,4,5,6],
      fretFrom: 0,
      fretTo: 17,
      dotsOnly: false,
      wholeToneOnly: false,
      byNote: false,
      order: 'alphabet',
      accidental: 'sharps',
      time: 4,
      maxQuestions: 30,
    },
    {
      id: expertId + 1,
      label: `Stage ${expertId + 1}`,
      title: 'All Strings · Full Neck',
      shortDesc: '🎸 All 6 strings · Frets 0–21 · By note',
      description: 'All 6 strings, all 12 notes, full neck frets 0–21. See a note — find every fret on any string. The complete fretboard. No shortcuts left.',
      string: 6,
      multiStrings: [1,2,3,4,5,6],
      fretFrom: 0,
      fretTo: 21,
      dotsOnly: false,
      wholeToneOnly: false,
      byNote: true,
      order: 'alphabet',
      accidental: 'sharps',
      time: 3,
      maxQuestions: 30,
    },
  ];

  return [...all, ...pairStages, ...expertStages];
}

export const STAGES: Stage[] = buildAllStages();
export const TOTAL_STAGES = STAGES.length;
