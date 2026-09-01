// Offline accuracy / confusion report for the template-matching voice
// recogniser. Run by hand — not part of `npm run build`.
//
// It runs WAVs (or the bundled templates themselves) through the SAME
// pipeline the app uses — `computeMfcc` -> `knnVote` / `matchTemplates` —
// and prints, per vocab key:
//
//   • overall + per-label accuracy
//   • the worst confusions (actual -> predicted, count)
//   • nearest-distance distribution for CORRECT vs WRONG predictions, and a
//     suggested `absMax` gate; the same for the knn vote ratio / `relMax`
//
// Use it to pick `voiceProfileAbsMax` / `voiceGeneralAbsMax` / the `relMax`
// defaults with numbers instead of guesswork — especially after any change
// to `mfcc.ts` (delta features, filtering) shifts the distance scale.
//
// Modes
//   --loo                 leave-one-out over the bundled general templates
//                         (no recordings needed; slightly optimistic because
//                         formant-shifted siblings of one WAV stay in the set)
//   <wav-dir>             evaluate labelled WAVs (naming per scripts/wav-lib
//                         `classify`: alpha_C_*.wav, frets_5_*.wav, …)
//
// Options
//   --templates <path>    template source: a .ts with a default export, or a
//                         .json (default: src/utils/generalVoiceTemplates.ts)
//   --strategy knn|best   matcher (default knn — what the general engine uses)
//   --k <n>               knn neighbours (default 5)
//   --segmented           also run the two-stage letter+accidental path on
//                         the notes-* keys (needs a <wav-dir>)
//
// Usage:
//   node --experimental-strip-types scripts/eval-voice.mts --loo
//   node --experimental-strip-types scripts/eval-voice.mts ./test-wav --strategy best
//   node --experimental-strip-types scripts/eval-voice.mts ./test-wav --segmented

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { computeMfcc, framesFromJson } from '../src/utils/mfcc.ts';
import { dtwDistance, knnVote, matchTemplates, type Template } from '../src/utils/dtw.ts';
import { segmentUtterance } from '../src/utils/utteranceCapture.ts';
import { decodeWav, trimSilence, classify, KEYS, type VocabKey } from './wav-lib.mts';

// ── args ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const loo = argv.includes('--loo');
const segmented = argv.includes('--segmented');
const strategy: 'knn' | 'best' = argv.includes('--strategy')
  ? (argv[argv.indexOf('--strategy') + 1] === 'best' ? 'best' : 'knn')
  : 'knn';
const k = argv.includes('--k') ? Math.max(1, Number(argv[argv.indexOf('--k') + 1]) || 5) : 5;
const tplArg = argv.includes('--templates') ? argv[argv.indexOf('--templates') + 1] : null;
const wavDir = argv.find((a, i) => !a.startsWith('--')
  && argv[i - 1] !== '--templates' && argv[i - 1] !== '--strategy' && argv[i - 1] !== '--k');

if (!loo && !wavDir) {
  console.error('usage: eval-voice.mts (--loo | <wav-dir>) [--templates p] [--strategy knn|best] [--k n] [--segmented]');
  process.exit(1);
}

// ── load templates ──────────────────────────────────────────────────
type RawSet = Record<string, { label: string; frames: number[][] }[]>;

async function loadTemplateSets(): Promise<RawSet> {
  const path = resolve(
    import.meta.dirname,
    tplArg ?? '../src/utils/generalVoiceTemplates.ts',
  );
  if (path.endsWith('.json')) {
    return JSON.parse(readFileSync(path, 'utf8')) as RawSet;
  }
  const mod = await import(pathToFileURL(path).href);
  return (mod.default ?? mod) as RawSet;
}

const rawSets = await loadTemplateSets();
const sets: Record<string, Template[]> = {};
for (const key of Object.keys(rawSets)) {
  sets[key] = rawSets[key].map((r) => ({ label: r.label, frames: framesFromJson(r.frames) }));
}

// ── matcher (mirrors templateSpeechEngine) ──────────────────────────
function predict(
  frames: Float32Array[],
  templates: Template[],
): { label: string | undefined; nearest: number; ratio: number } {
  if (!templates.length || !frames.length) return { label: undefined, nearest: Infinity, ratio: 1 };
  if (strategy === 'knn') {
    const { ranked, nearest } = knnVote(frames, templates, k);
    const ratio = ranked[1] ? ranked[1].score / ranked[0].score : 0;
    return { label: ranked[0]?.label, nearest, ratio };
  }
  const ranked = matchTemplates(frames, templates);
  const ratio = ranked[1] ? ranked[0].distance / ranked[1].distance : 0;
  return { label: ranked[0]?.label, nearest: ranked[0]?.distance ?? Infinity, ratio };
}

// ── stats helpers ──────────────────────────────────────────────────
const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : '  -') + '%';
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '∞');

// composing "F" + "b" etc — the same tables the app uses (speechVocab.ts)
const FLAT_TO_SHARP: Record<string, string> = {
  A: 'G#', B: 'A#', C: 'B', D: 'C#', E: 'D#', F: 'E', G: 'F#',
};
const SHARP_WRAP: Record<string, string> = { 'E#': 'F', 'B#': 'C' };
const normNote = (s: string): string => SHARP_WRAP[s] ?? s;

interface Row { key: string; actual: string; predicted: string | undefined; nearest: number; ratio: number }

// ── collect rows ───────────────────────────────────────────────────
const rows: Row[] = [];

if (loo) {
  for (const key of Object.keys(sets)) {
    const all = sets[key];
    for (let i = 0; i < all.length; i++) {
      const rest = all.slice(0, i).concat(all.slice(i + 1));
      const { label, nearest, ratio } = predict(all[i].frames, rest);
      rows.push({ key, actual: all[i].label, predicted: label, nearest, ratio });
    }
  }
} else {
  let skipped = 0;
  for (const file of readdirSync(wavDir!)) {
    if (!file.toLowerCase().endsWith('.wav')) continue;
    const t = classify(file);
    if (!t) { skipped++; continue; }
    const { pcm, sampleRate } = decodeWav(readFileSync(resolve(wavDir!, file)));
    const { frames } = computeMfcc(trimSilence(pcm, sampleRate), sampleRate);
    if (!frames.length) { skipped++; continue; }

    if (segmented && t.key.startsWith('notes-')) {
      const notation = t.key === 'notes-solfege' ? 'solfege' : 'alpha';
      const letters = (sets[`notes-${notation}`] ?? []).filter((x) => /^[A-G]$/.test(x.label));
      const accs = sets[`accidentals-${notation}`] ?? [];
      const segs = segmentUtterance(pcm, sampleRate)
        .map((s) => computeMfcc(s, sampleRate).frames)
        .filter((fr) => fr.length);
      const lp = predict(segs[0] ?? frames, letters);
      let note = lp.label;
      let nearest = lp.nearest;
      let ratio = lp.ratio;
      if (lp.label && segs[1]) {
        const ap = predict(segs[1], accs);
        if (ap.label === '#') note = `${lp.label}#`;
        else if (ap.label === 'b') note = FLAT_TO_SHARP[lp.label] ?? lp.label;
        nearest = Math.max(nearest, ap.nearest);
        ratio = Math.max(ratio, ap.ratio);
      }
      note = SHARP_WRAP[note ?? ''] ?? note;
      rows.push({ key: t.key, actual: normNote(t.label), predicted: note && normNote(note), nearest, ratio });
      continue;
    }

    const { label, nearest, ratio } = predict(frames, sets[t.key] ?? []);
    rows.push({ key: t.key, actual: t.label, predicted: label, nearest, ratio });
  }
  if (skipped) console.log(`(skipped ${skipped} files: name not recognised or too short)\n`);
}

// ── report ─────────────────────────────────────────────────────────
console.log(`templates: ${tplArg ?? 'src/utils/generalVoiceTemplates.ts'}`);
console.log(`mode: ${loo ? 'leave-one-out' : wavDir}   strategy: ${strategy}${strategy === 'knn' ? ` (k=${k})` : ''}${segmented ? '   segmented' : ''}\n`);

const byKey = new Map<string, Row[]>();
for (const r of rows) {
  if (!byKey.has(r.key)) byKey.set(r.key, []);
  byKey.get(r.key)!.push(r);
}

let gTot = 0;
let gOk = 0;
for (const key of KEYS) {
  const rs = byKey.get(key);
  if (!rs || !rs.length) continue;
  const ok = rs.filter((r) => r.predicted === r.actual);
  gTot += rs.length;
  gOk += ok.length;

  console.log(`━━ ${key}  —  ${ok.length}/${rs.length}  ${pct(ok.length, rs.length)}`);

  // per-label
  const labels = [...new Set(rs.map((r) => r.actual))].sort();
  for (const lab of labels) {
    const lr = rs.filter((r) => r.actual === lab);
    const lok = lr.filter((r) => r.predicted === lab).length;
    if (lok < lr.length) {
      const conf = new Map<string, number>();
      for (const r of lr) if (r.predicted !== lab) {
        conf.set(r.predicted ?? '∅', (conf.get(r.predicted ?? '∅') ?? 0) + 1);
      }
      const worst = [...conf.entries()].sort((a, b) => b[1] - a[1])
        .map(([p, c]) => `${p}×${c}`).join(' ');
      console.log(`    ${lab.padEnd(4)} ${String(lok).padStart(3)}/${lr.length}   → ${worst}`);
    }
  }

  // distance / ratio distributions — the numbers for absMax / relMax
  const okN = ok.map((r) => r.nearest).filter(Number.isFinite);
  const badN = rs.filter((r) => r.predicted !== r.actual).map((r) => r.nearest).filter(Number.isFinite);
  const okR = ok.map((r) => r.ratio).filter(Number.isFinite);
  console.log(`    nearest  correct  p50 ${f2(quantile(okN, 0.5))}  p90 ${f2(quantile(okN, 0.9))}  p95 ${f2(quantile(okN, 0.95))}  max ${f2(quantile(okN, 1))}`);
  if (badN.length) {
    console.log(`    nearest  wrong    p10 ${f2(quantile(badN, 0.1))}  p50 ${f2(quantile(badN, 0.5))}`);
    const sug = quantile(okN, 0.95);
    const leak = badN.filter((d) => d <= sug).length;
    console.log(`    → absMax ≈ ${Math.ceil(sug)}  (still lets ${leak}/${badN.length} wrong matches through)`);
  }
  if (strategy === 'knn') console.log(`    voteRatio correct  p90 ${f2(quantile(okR, 0.9))}  p95 ${f2(quantile(okR, 0.95))}   → relMax ≈ ${quantile(okR, 0.95).toFixed(2)}`);
  else console.log(`    distRatio correct  p90 ${f2(quantile(okR, 0.9))}  p95 ${f2(quantile(okR, 0.95))}   → relMax ≈ ${quantile(okR, 0.95).toFixed(2)}`);
  console.log();
}

console.log(`═══ TOTAL  ${gOk}/${gTot}  ${pct(gOk, gTot)}`);
