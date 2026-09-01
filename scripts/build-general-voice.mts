// One-off build tool (run by hand, not part of `npm run build`).
//
// Reads the synthetic TTS WAVs generated from Windows System.Speech and
// turns them into MFCC templates for the "General" voice engine. Output is
// checked in as src/utils/generalVoiceTemplates.ts so the app ships a tiny,
// accent-neutral reference set for the twelve note names — no model
// download at all.
//
// Usage:  node --experimental-strip-types scripts/build-general-voice.mts <wav-dir>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { computeMfcc, framesToJson } from '../src/utils/mfcc.ts';

const wavDir = process.argv[2];
if (!wavDir) {
  console.error('pass the WAV directory as the first argument');
  process.exit(1);
}

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

const out: Record<string, { label: string; frames: number[][] }[]> = {
  'notes-alpha': [],
  'notes-solfege': [],
};

let n = 0;
for (const file of readdirSync(wavDir)) {
  if (!file.endsWith('.wav')) continue;
  const m = file.match(/^(alpha|solfege)_([A-Za-z]+)_/);
  if (!m) { console.warn('skip (name)', file); continue; }
  const [, set, frag] = m;
  const map = set === 'alpha' ? ALPHA : SOLFEGE;
  const label = map[frag];
  if (!label) { console.warn('skip (label)', file); continue; }

  const { pcm, sampleRate } = decodeWav(readFileSync(join(wavDir, file)));
  const trimmed = trimSilence(pcm, sampleRate);

  for (const shift of SHIFTS) {
    const { frames } = computeMfcc(formantShift(trimmed, shift), sampleRate);
    if (frames.length < 4) { console.warn('skip (too short)', file, shift); continue; }
    out[`notes-${set}`].push({ label, frames: round2(framesToJson(frames)) });
    n++;
  }
}

const body = `// AUTO-GENERATED by scripts/build-general-voice.mts — do not edit by hand.
//
// Synthetic-TTS (Windows System.Speech, David + Zira voices) MFCC reference
// templates for the "General" voice engine — an accent-neutral fallback for
// the twelve note names that needs no model download. Regenerate with:
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
