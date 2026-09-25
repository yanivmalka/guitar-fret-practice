// Focused checks for the Exercise B / C question pickers in
// src/learning/scaleDrill.ts (pickScaleIdentifyQuestion, pickScaleDegreeQuestion).
//
//   node --experimental-strip-types scripts/check-scale-chip-drill.mts
//
// Covers:
//   • pickScaleIdentifyQuestion: playFrets are a real semitone-correct
//     ascending run on the root string, options always include the answer
//     and degrade gracefully to 1 with a single shipped scale type
//   • pickScaleDegreeQuestion: target note matches noteNameAtSemitones for
//     the chosen degree, options always include the target, degree index is
//     always in range
//   • both degrade to null on the same bad-pool/short-instrument inputs
//     pickScaleQuestion already does
//   • over many random picks: never throws, always internally consistent

import { register } from 'node:module';

register(
  'data:text/javascript,' + encodeURIComponent(
    "export async function resolve(s,c,n){" +
    "if((s.startsWith('./')||s.startsWith('../'))&&!/\\.(m?ts|m?js|json|node)$/i.test(s)){" +
    "try{return await n(s+'.ts',c);}catch{}}" +
    "return n(s,c);}" +
    "export async function load(u,c,n){" +
    "const r=await n(u,c);" +
    "const s=r.source==null?null:r.source.toString();" +
    "if(s!==null&&s.includes('import.meta.env')){" +
    "return {...r, source: s.split('import.meta.env').join('({BASE_URL:\"/\"})')};" +
    "}return r;}",
  ),
  import.meta.url,
);

const { buildScalePool, pickScaleIdentifyQuestion, pickScaleDegreeQuestion } =
  await import('../src/learning/scaleDrill.ts');
const { scaleTypeById } = await import('../src/utils/scales.ts');
const { noteNameAtSemitones } = await import('../src/utils/intervals.ts');
const { INSTRUMENTS } = await import('../src/utils/instruments.ts');

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`);
  else { failures++; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const guitar = INSTRUMENTS.guitar;
const bass = INSTRUMENTS.bass;

// ── pickScaleIdentifyQuestion ──────────────────────────────────────────
{
  const pool = buildScalePool(['minorPentatonic'], guitar.stringCount);
  const q = pickScaleIdentifyQuestion(pool, guitar.notes, guitar.stringCount, guitar.maxFret, 4, () => 0);
  check('returns a question for a valid pool', q !== null, JSON.stringify(q));

  const mp = scaleTypeById('minorPentatonic')!;
  check('playFrets is [root, ...degrees] offset from rootFret, ascending',
    !!q && JSON.stringify(q.playFrets) === JSON.stringify([0, ...mp.degrees].map((s) => q!.rootFret + s)));
  check('playFrets pitches are semitone-correct against the root note',
    !!q && q.playFrets.every((f, i) => {
      const semis = i === 0 ? 0 : mp.degrees[i - 1];
      return noteNameAtSemitones(q!.rootName, semis) === guitar.notes[q!.rootString - 1][f];
    }));
  check('options always include the answer', !!q && q.options.includes(q.scaleTypeId));
  check('a one-scale pool still fills the chips from the other shipped scales',
    !!q && q.options.length === 4 && new Set(q.options).size === 4);

  check('null pool -> null',
    pickScaleIdentifyQuestion([], guitar.notes, guitar.stringCount, guitar.maxFret) === null);
}

// ── pickScaleDegreeQuestion ─────────────────────────────────────────────
{
  const pool = buildScalePool(['minorPentatonic'], guitar.stringCount);
  const q = pickScaleDegreeQuestion(pool, guitar.notes, guitar.stringCount, guitar.maxFret, 4, () => 0);
  check('returns a question for a valid pool', q !== null, JSON.stringify(q));

  const mp = scaleTypeById('minorPentatonic')!;
  check('degreeIndex is in range', !!q && q.degreeIndex >= 0 && q.degreeIndex < mp.degrees.length);
  check('targetNote matches noteNameAtSemitones for the chosen degree',
    !!q && q.targetNote === noteNameAtSemitones(q.rootName, mp.degrees[q.degreeIndex]));
  check('degreeLabel matches the scale type\'s own label for that degree',
    !!q && q.degreeLabel === mp.degreeLabels[q.degreeIndex]);
  check('options always include the target note', !!q && q.options.includes(q.targetNote));
  check('options has at least 2 chips (real distractors exist)', !!q && q.options.length >= 2);

  check('null pool -> null',
    pickScaleDegreeQuestion([], guitar.notes, guitar.stringCount, guitar.maxFret) === null);
}

// ── Randomised stress ───────────────────────────────────────────────────
for (const [label, inst] of [['guitar', guitar], ['bass', bass]] as const) {
  const pool = buildScalePool(['minorPentatonic'], inst.stringCount);
  let bad = false;
  for (let i = 0; i < 200; i++) {
    const iq = pickScaleIdentifyQuestion(pool, inst.notes, inst.stringCount, inst.maxFret);
    const dq = pickScaleDegreeQuestion(pool, inst.notes, inst.stringCount, inst.maxFret);
    if (!iq || !iq.options.includes(iq.scaleTypeId)) { bad = true; break; }
    if (!dq || !dq.options.includes(dq.targetNote)) { bad = true; break; }
  }
  check(`${label}: 200 random picks of both exercises stay internally consistent`, !bad);
}

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
