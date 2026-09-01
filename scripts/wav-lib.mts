// Shared helpers for the offline voice-tooling scripts:
//   • build-general-voice.mts — WAVs -> bundled MFCC template file
//   • eval-voice.mts          — accuracy / confusion report
//
// Pure Node, no browser APIs. WAV decoding is 16-bit PCM mono, chunk-scanned.

// filename label fragment -> canonical note the engine emits
export const ALPHA: Record<string, string> = {
  C: 'C', Cs: 'C#', D: 'D', Ds: 'D#', E: 'E', F: 'F',
  Fs: 'F#', G: 'G', Gs: 'G#', A: 'A', As: 'A#', B: 'B',
};
export const SOLFEGE: Record<string, string> = {
  do: 'C', dos: 'C#', re: 'D', res: 'D#', mi: 'E', fa: 'F',
  fas: 'F#', sol: 'G', sols: 'G#', la: 'A', las: 'A#', si: 'B',
};

// Isolated accidental words → the segmented label the personal profile
// also stores ('#' / 'b'), grouped by notation.
export const ACCIDENTAL_WORDS: Record<string, { set: 'alpha' | 'solfege'; label: string }> = {
  sharp: { set: 'alpha', label: '#' },
  flat: { set: 'alpha', label: 'b' },
  diese: { set: 'solfege', label: '#' },
  bemol: { set: 'solfege', label: 'b' },
};

export const KEYS = [
  'notes-alpha', 'notes-solfege',
  'accidentals-alpha', 'accidentals-solfege',
  'frets-1-24',
] as const;
export type VocabKey = (typeof KEYS)[number];

// ── WAV decode (16-bit PCM mono, chunk-scanned) ──────────────────────
export function decodeWav(buf: Buffer): { pcm: Float32Array; sampleRate: number } {
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
export function trimSilence(pcm: Float32Array, sr: number): Float32Array {
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

// Map one WAV filename to its output vocab key + label, or null to skip.
// Filename prefix conventions (everything after the shown prefix is free —
// voice name, index, …):
//   frets_<n>_*.wav
//   alpha_<frag>_*.wav   solfege_<frag>_*.wav   (frag = ALPHA/SOLFEGE key,
//                                                or an ACCIDENTAL_WORDS key)
export function classify(file: string): { key: VocabKey; label: string } | null {
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
