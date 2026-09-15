// Offline comparison of how the segmented personal-profile recogniser reads
// "<letter> sharp" — hand-run diagnostic, never part of a build.
//
// Every WAV in <wav-dir> (alpha_<frag>_*.wav, see wav-lib `classify`) is run
// through three decoders against one exported personal profile:
//
//   quiet   segmentUtterance + split hypothesis cut at the quietest frame
//   search  segmentUtterance + split hypothesis cut chosen by matcher score
//           (the current templateSpeechEngine code)
//   concat  no cut: the whole trimmed utterance is matched against every
//           letter template and every letter+accidental concatenation
//   concatG concat with the ratio gate;  concatI concat on isolateWord audio
//   hybrid  quiet, overridden by concatG only when it reads an accidental
//
// quiet/search reproduce runSegmented's decision including its gates
// (a gated-out turn is reported as "∅", i.e. the app would listen again);
// concat / concatI are reported ungated.
//
// Profile export (browser console, on the app's origin) → voice-profile.json:
// an array of StoredTemplate rows from IndexedDB `voiceProfiles`.
//
// Usage:
//   node --experimental-strip-types scripts/eval-accidental-split.mts <wav-dir> <voice-profile.json> [vocabId]

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { registerHooks } from 'node:module';
import { computeMfcc, framesFromJson } from '../src/utils/mfcc.ts';
import { dtwDistance, matchTemplates, type Template } from '../src/utils/dtw.ts';
import { decodeWav, trimSilence, classify } from './wav-lib.mts';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (e) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw e;
    }
  },
});
const { segmentUtterance, isolateWord } = await import('../src/utils/utteranceCapture.ts');

const [wavDir, profilePath, vocabArg] = process.argv.slice(2);
if (!wavDir || !profilePath) {
  console.error('usage: eval-accidental-split.mts <wav-dir> <voice-profile.json> [vocabId]');
  process.exit(1);
}

interface Row { profile: string; vocabId: string; label: string; frames: number[][]; source?: string }
const rows = JSON.parse(readFileSync(resolve(profilePath), 'utf8')) as Row[];
const vocabs = [...new Set(rows.map((r) => r.vocabId))];
const vocabId = vocabArg ?? vocabs.find((v) => v.startsWith('notes-alpha')) ?? vocabs[0];
const profiles = [...new Set(rows.filter((r) => r.vocabId === vocabId).map((r) => r.profile))];
if (profiles.length !== 1) {
  console.error(`expected one profile for ${vocabId}, found: ${profiles.join(', ') || 'none'}`);
  process.exit(1);
}
const tpl: Template[] = rows
  .filter((r) => r.vocabId === vocabId)
  .map((r) => ({ label: r.label, frames: framesFromJson(r.frames) }));
const letters = tpl.filter((t) => /^[A-G]$/.test(t.label));
const accidentals = tpl.filter((t) => t.label === '#' || t.label === 'b');
console.log(`profile ${profiles[0]}  vocab ${vocabId}  letters ${letters.length}  accidentals ${accidentals.length}`);

// Same constants / tables as templateSpeechEngine.
const RATIO_CAP = 0.97;
const ACC_ABS_MAX = 25;
const SHARP_WRAP: Record<string, string> = { 'E#': 'F', 'B#': 'C' };
const FLAT_TO_SHARP: Record<string, string> = { A: 'G#', B: 'A#', C: 'B', D: 'C#', E: 'D#', F: 'E', G: 'F#' };

function compose(letter: string, acc: string | null): string {
  if (!acc) return letter;
  if (acc === '#') return SHARP_WRAP[`${letter}#`] ?? `${letter}#`;
  return FLAT_TO_SHARP[letter] ?? letter;
}

function gate(ranked: { label: string; distance: number }[], cap = Infinity): string | null {
  const [best, second] = ranked;
  if (!best || !Number.isFinite(best.distance) || best.distance > cap) return null;
  if (second && best.distance > second.distance * RATIO_CAP) return null;
  return best.label;
}

const mfcc = (pcm: Float32Array, sr: number) => computeMfcc(pcm, sr).frames;

type Split = { letterF: Float32Array[]; accF: Float32Array[]; half: number; acc: number } | null;

function quietCut(seg0: Float32Array, sr: number): Split {
  const frame = Math.max(1, Math.round(0.02 * sr));
  const n = Math.floor(seg0.length / frame);
  if (n < 2) return null;
  const rms = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0;
    for (let i = 0; i < frame; i++) { const x = seg0[f * frame + i]; s += x * x; }
    rms[f] = Math.sqrt(s / frame);
  }
  const lo = Math.floor(n * 0.2);
  const hi = n - Math.floor(n * 0.2);
  let cut = lo;
  let min = Infinity;
  for (let f = lo; f < hi; f++) if (rms[f] < min) { min = rms[f]; cut = f; }
  const pad = Math.round(0.03 * sr);
  const letterF = mfcc(seg0.subarray(0, Math.min(seg0.length, cut * frame + pad)), sr);
  const accF = mfcc(seg0.subarray(Math.max(0, cut * frame - pad)), sr);
  if (!letterF.length || !accF.length) return null;
  const half = matchTemplates(letterF, letters)[0]?.distance ?? Infinity;
  const acc = matchTemplates(accF, accidentals)[0]?.distance ?? Infinity;
  return { letterF, accF, half, acc };
}

function searchCut(seg0: Float32Array, sr: number): Split {
  const step = Math.round(0.02 * sr);
  const pad = Math.round(0.03 * sr);
  let best: Split = null;
  for (let cut = Math.floor(seg0.length * 0.2); cut <= seg0.length * 0.8; cut += step) {
    const letterF = mfcc(seg0.subarray(0, Math.min(seg0.length, cut + pad)), sr);
    const accF = mfcc(seg0.subarray(Math.max(0, cut - pad)), sr);
    if (!letterF.length || !accF.length) continue;
    const half = matchTemplates(letterF, letters)[0]?.distance ?? Infinity;
    const acc = matchTemplates(accF, accidentals)[0]?.distance ?? Infinity;
    if (!Number.isFinite(half) || !Number.isFinite(acc)) continue;
    if (!best || half + acc < best.half + best.acc) best = { letterF, accF, half, acc };
  }
  return best;
}

function segmentedDecode(pcm: Float32Array, sr: number, splitFn: (s: Float32Array, sr: number) => Split): string {
  const raw = segmentUtterance(pcm, sr);
  const segF = raw.map((s) => mfcc(s, sr)).filter((f) => f.length);
  if (!segF.length) return '∅';
  let letterF = segF[0];
  let accF: Float32Array[] | null = segF[1] ?? null;
  const sp = splitFn(raw[0], sr);
  if (sp) {
    const whole = matchTemplates(segF[0], letters)[0]?.distance ?? Infinity;
    if (sp.half < whole && sp.acc <= ACC_ABS_MAX) { letterF = sp.letterF; accF = sp.accF; }
  }
  const letter = gate(matchTemplates(letterF, letters));
  if (!letter) return '∅';
  if (!accF) return letter;
  const acc = gate(matchTemplates(accF, accidentals), ACC_ABS_MAX);
  return acc ? compose(letter, acc) : '∅';
}

// Concatenations are built once: every letter take × every accidental take.
const combos: Template[] = [];
for (const l of letters) for (const a of accidentals) {
  combos.push({ label: compose(l.label, a.label), frames: [...l.frames, ...a.frames] });
}

function concatDecode(pcm: Float32Array, sr: number, trim: (p: Float32Array, sr: number) => Float32Array = trimSilence): { note: string; gated: string; ranked: string } {
  const frames = mfcc(trim(pcm, sr), sr);
  if (!frames.length) return { note: '∅', gated: '∅', ranked: '' };
  const byNote = new Map<string, number>();
  for (const t of [...letters, ...combos]) {
    const d = dtwDistance(frames, t.frames);
    if (d < (byNote.get(t.label) ?? Infinity)) byNote.set(t.label, d);
  }
  const ranked = [...byNote.entries()].sort((a, b) => a[1] - b[1]);
  const gated = gate(ranked.map(([label, distance]) => ({ label, distance }))) ?? '∅';
  return { note: ranked[0][0], gated, ranked: ranked.slice(0, 3).map(([l, d]) => `${l}:${d.toFixed(1)}`).join(' ') };
}

// concatG  concat with the app's ratio gate (a close call → ∅, listen again)
// concatI  concat on isolateWord-trimmed audio, as calibration takes are
// hybrid   quiet decides, except when gated concat hears an accidental
const methods = ['quiet', 'search', 'concat', 'concatG', 'concatI', 'hybrid'] as const;
// [correct, total, wrong answer]
const tally = { natural: {} as Record<string, [number, number, number]>, sharp: {} as Record<string, [number, number, number]> };
for (const g of ['natural', 'sharp'] as const) for (const m of methods) tally[g][m] = [0, 0, 0];

console.log(`\n${'file'.padEnd(20)} want ${methods.map((m) => m.padEnd(7)).join(' ')} (concat top-3)`);
for (const file of readdirSync(wavDir).sort()) {
  if (!file.toLowerCase().endsWith('.wav')) continue;
  const t = classify(file);
  if (!t || t.key !== 'notes-alpha') continue;
  const { pcm, sampleRate } = decodeWav(readFileSync(resolve(wavDir, file)));
  const want = SHARP_WRAP[t.label] ?? t.label;
  const c = concatDecode(pcm, sampleRate);
  const ci = concatDecode(pcm, sampleRate, isolateWord);
  const quiet = segmentedDecode(pcm, sampleRate, quietCut);
  const got: Record<typeof methods[number], string> = {
    quiet,
    search: segmentedDecode(pcm, sampleRate, searchCut),
    concat: c.note,
    concatG: c.gated,
    concatI: ci.note,
    hybrid: c.gated.includes('#') ? c.gated : quiet,
  };
  const g = want.includes('#') ? 'sharp' : 'natural';
  for (const m of methods) {
    tally[g][m][1]++;
    if (got[m] === want) tally[g][m][0]++;
    else if (got[m] !== '∅') tally[g][m][2]++;
  }
  const mark = (m: typeof methods[number]) => (got[m] === want ? got[m] : `${got[m]}✗`);
  console.log(`${file.padEnd(20)} ${want.padEnd(4)} ${methods.map((m) => mark(m).padEnd(7)).join(' ')} (${c.ranked})`);
}

console.log('\ncorrect / wrong answer / total   (∅ = gated out, app would listen again — not a wrong answer)');
for (const g of ['sharp', 'natural'] as const) {
  console.log(`  ${g.padEnd(8)} ` + methods.map((m) => `${m} ${tally[g][m][0]}/${tally[g][m][2]}/${tally[g][m][1]}`).join('   '));
}
