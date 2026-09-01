// One-off build tool (run by hand, not part of `npm run build`).
//
// Reads the synthetic TTS WAVs generated from Windows System.Speech and
// turns them into MFCC templates for the "General" voice engine. Output is
// checked in as src/utils/generalVoiceTemplates.ts so the app ships a tiny,
// accent-neutral reference set — no model download at all.
//
// It rebuilds the file wholesale from whatever is in <wav-dir>, so the
// directory must hold the COMPLETE set every time, not just new additions.
//
// Expected WAV filenames (everything after the shown prefix is free, e.g.
// the voice name and an index):
//
//   notes, whole-word:   alpha_C_*.wav  alpha_Cs_*.wav  … solfege_do_*.wav
//                        (frag = ALPHA / SOLFEGE key below)
//   accidental words:    alpha_sharp_*.wav   alpha_flat_*.wav
//                        solfege_diese_*.wav solfege_bemol_*.wav
//   fret numbers:        frets_1_*.wav … frets_24_*.wav
//
// Output vocab keys: 'notes-alpha', 'notes-solfege', 'accidentals-alpha',
// 'accidentals-solfege', 'frets-1-24'. Keys with no matching WAVs come out
// as empty arrays, which consumers treat as "no reference, don't gate".
//
// Usage:  node --experimental-strip-types scripts/build-general-voice.mts <wav-dir>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { computeMfcc, framesToJson } from '../src/utils/mfcc.ts';

const args = process.argv.slice(2);
const merge = args.includes('--merge');
const wavDir = args.find((a) => !a.startsWith('--'));
if (!wavDir) {
  console.error('usage: build-general-voice.mts <wav-dir> [--merge]');
  process.exit(1);
}

// --merge: start from the checked-in file and only replace vocab keys that
// this run actually produced WAVs for, so you can add e.g. the fret numbers
// without also having every note WAV on hand.
const OUT = resolve(import.meta.dirname, '../src/utils/generalVoiceTemplates.ts');

// filename label fragment -> canonical note the engine emits
const ALPHA: Record<string, string> = {
  C: 'C', Cs: 'C#', D: 'D', Ds: 'D#', E: 'E', F: 'F',
  Fs: 'F#', G: 'G', Gs: 'G#', A: 'A', As: 'A#', B: 'B',
};
const SOLFEGE: Record<string, string> = {
  do: 'C', dos: 'C#', re: 'D', res: 'D#', mi: 'E', fa: 'F',
  fas: 'F#', sol: 'G', sols: 'G#', la: 'A', las: 'A#', si: 'B',
};

// Isolated accidental words → the segmented label the personal profile
// also stores ('#' / 'b'), grouped by notation.
const ACCIDENTAL_WORDS: Record<string, { set: 'alpha' | 'solfege'; label: string }> = {
  sharp: { set: 'alpha', label: '#' },
  flat: { set: 'alpha', label: 'b' },
  diese: { set: 'solfege', label: '#' },
  bemol: { set: 'solfege', label: 'b' },
};

// ── WAV decode (16-bit PCM mono, chunk-scanned) ──────────────────────
function decodeWav(buf: Buffer): { pcm: Float32Array; sampleRate: number } {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let pos = 12;
  let sampleRate = 22050;
  let bitsPerSample = 16;
  let channels = 1;
  let dataOffset = -1;
  let dataLen = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bitsPerSample = buf.readUInt16LE(body + 14);
    } else if (id === 'data') {
      dataOffset = body;
      dataLen = size;
    }
    pos = body + size + (size % 2);
  }
  if (dataOffset < 0) throw new Error('no data chunk');
  if (bitsPerSample !== 16) throw new Error(`unsupported bit depth ${bitsPerSample}`);

  const sampleCount = Math.floor(dataLen / 2 / channels);
  const pcm = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    // take channel 0 only
    const s = buf.readInt16LE(dataOffset + i * 2 * channels);
    pcm[i] = s / 32768;
  }
  return { pcm, sampleRate };
}

// ── Trim leading / trailing silence ─────────────────────────────────
function trimSilence(pcm: Float32Array, sr: number): Float32Array {
  const win = Math.max(1, Math.round(sr * 0.02));
  const rmsAt = (start: number) => {
    let acc = 0;
    const end = Math.min(pcm.length, start + win);
    for (let i = start; i < end; i++) acc += pcm[i] * pcm[i];
    return Math.sqrt(acc / (end - start));
  };
  let peak = 0;
  for (let i = 0; i < pcm.length; i += win) peak = Math.max(peak, rmsAt(i));
  const gate = Math.max(0.015, peak * 0.15);
  let first = 0;
  for (let i = 0; i < pcm.length; i += win) { if (rmsAt(i) > gate) { first = i; break; } }
  let last = pcm.length;
  for (let i = pcm.length - win; i >= 0; i -= win) { if (rmsAt(i) > gate) { last = i + win; break; } }
  const pad = Math.round(sr * 0.03);
  first = Math.max(0, first - pad);
  last = Math.min(pcm.length, last + pad);
  return pcm.subarray(first, last);
}

const round2 = (rows: number[][]) => rows.map((r) => r.map((v) => Math.round(v * 100) / 100));

// Naive resample that keeps the reported sample rate — shifts formants and
// pitch, cheaply synthesising extra "speakers" from the two TTS voices so
// the general set covers more of the vocal-tract range. DTW is
// duration-invariant, so the length change is harmless.
function formantShift(pcm: Float32Array, factor: number): Float32Array {
  if (factor === 1) return pcm;
  const outLen = Math.max(1, Math.round(pcm.length / factor));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * factor;
    const i0 = Math.floor(pos);
    const i1 = Math.min(pcm.length - 1, i0 + 1);
    const f = pos - i0;
    out[i] = pcm[i0] * (1 - f) + pcm[i1] * f;
  }
  return out;
}
const SHIFTS = [0.9, 0.95, 1.0, 1.06, 1.12];

type Tmpl = { label: string; frames: number[][] };
const KEYS = [
  'notes-alpha', 'notes-solfege',
  'accidentals-alpha', 'accidentals-solfege',
  'frets-1-24',
] as const;

const built: Record<string, Tmpl[]> = Object.fromEntries(KEYS.map((k) => [k, []]));

// Map one WAV filename to its output vocab key + label, or null to skip.
function classify(file: string): { key: string; label: string } | null {
  let m = file.match(/^frets_(\d{1,2})_/);
  if (m) {
    const num = Number(m[1]);
    return num >= 1 && num <= 24 ? { key: 'frets-1-24', label: String(num) } : null;
  }
  m = file.match(/^(alpha|solfege)_([A-Za-z]+)_/);
  if (!m) return null;
  const set = m[1] as 'alpha' | 'solfege';
  const frag = m[2];
  const acc = ACCIDENTAL_WORDS[frag.toLowerCase()];
  if (acc && acc.set === set) return { key: `accidentals-${set}`, label: acc.label };
  const label = (set === 'alpha' ? ALPHA : SOLFEGE)[frag];
  return label ? { key: `notes-${set}`, label } : null;
}

let n = 0;
for (const file of readdirSync(wavDir)) {
  if (!file.endsWith('.wav')) continue;
  const target = classify(file);
  if (!target) { console.warn('skip (name/label)', file); continue; }

  const { pcm, sampleRate } = decodeWav(readFileSync(join(wavDir, file)));
  const trimmed = trimSilence(pcm, sampleRate);

  for (const shift of SHIFTS) {
    const { frames } = computeMfcc(formantShift(trimmed, shift), sampleRate);
    if (frames.length < 4) { console.warn('skip (too short)', file, shift); continue; }
    built[target.key].push({ label: target.label, frames: round2(framesToJson(frames)) });
    n++;
  }
}

// Assemble the final set. In --merge mode, keep every checked-in key and
// overwrite only the ones this run produced templates for.
let out: Record<string, Tmpl[]> = built;
if (merge) {
  const prev = (await import('../src/utils/generalVoiceTemplates.ts'))
    .default as Record<string, Tmpl[]>;
  out = { ...Object.fromEntries(KEYS.map((k) => [k, []])), ...prev };
  for (const k of KEYS) if (built[k].length) out[k] = built[k];
}

const body = `// AUTO-GENERATED by scripts/build-general-voice.mts — do not edit by hand.
//
// Synthetic-TTS (Windows System.Speech, David + Zira voices) MFCC reference
// templates for the "General" voice engine — an accent-neutral fallback
// that needs no model download. Keys: notes-alpha, notes-solfege,
// accidentals-alpha, accidentals-solfege, frets-1-24 (any may be empty).
// Regenerate with:
//   node --experimental-strip-types scripts/build-general-voice.mts <wav-dir>

export interface GeneralTemplate {
  label: string;
  frames: number[][];
}

const templates: Record<string, GeneralTemplate[]> = ${JSON.stringify(out)};

export default templates;
`;
writeFileSync(OUT, body);
const sizeKb = (Buffer.byteLength(body) / 1024).toFixed(1);
console.log(`wrote ${n} templates -> ${OUT} (${sizeKb} KB)`);
for (const k of Object.keys(out)) {
  const byLabel: Record<string, number> = {};
  for (const t of out[k]) byLabel[t.label] = (byLabel[t.label] ?? 0) + 1;
  console.log(' ', k, JSON.stringify(byLabel));
}
