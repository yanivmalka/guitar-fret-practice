// Convert a directory of labelled WAVs (the calibration screen's dev export,
// scripts/wav-lib.mts naming) into a template JSON usable as
// `eval-voice.mts --loo --templates <out>`. This is how to measure a real
// personal voice profile leave-one-out — comparing a user's own recordings
// against each other — rather than against the bundled general model, which
// is what eval-voice.mts's plain `<wav-dir>` mode does instead.
//
// Usage:
//   node --experimental-strip-types scripts/wav-to-templates.mts <wav-dir> <out.json>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeMfcc, framesToJson } from '../src/utils/mfcc.ts';
import { decodeWav, trimSilence, classify } from './wav-lib.mts';

const [wavDir, out] = process.argv.slice(2);
if (!wavDir || !out) {
  console.error('usage: wav-to-templates.mts <wav-dir> <out.json>');
  process.exit(1);
}

type RawSet = Record<string, { label: string; frames: number[][] }[]>;
const sets: RawSet = {};
let skipped = 0;

for (const file of readdirSync(wavDir)) {
  if (!file.toLowerCase().endsWith('.wav')) continue;
  const t = classify(file);
  if (!t) { skipped++; continue; }
  const { pcm, sampleRate } = decodeWav(readFileSync(resolve(wavDir, file)));
  const { frames } = computeMfcc(trimSilence(pcm, sampleRate), sampleRate);
  if (!frames.length) { skipped++; continue; }
  (sets[t.key] ??= []).push({ label: t.label, frames: framesToJson(frames) });
}

writeFileSync(out, JSON.stringify(sets));
if (skipped) console.log(`(skipped ${skipped} files: name not recognised or too short)`);
for (const key of Object.keys(sets)) {
  console.log(`${key}: ${sets[key].length} takes`);
}
