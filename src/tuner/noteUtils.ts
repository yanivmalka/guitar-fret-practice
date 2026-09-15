// Frequency <-> note-name math for the tuner prototype. Deliberately
// self-contained (does not reuse src/utils/music.ts) since this whole feature
// is being built in isolation before integration — see src/tuner/README.md.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const A4_MIDI = 69;

export interface NoteMatch {
  /** e.g. "A#" */
  name: string;
  /** Scientific pitch octave, e.g. 4 for A4. */
  octave: number;
  /** Signed cents offset from the exact note frequency, roughly -50..+50. */
  cents: number;
  /** MIDI note number of the nearest note. */
  midi: number;
}

/** Converts a frequency in Hz to the nearest 12-TET note name/octave/cents offset. */
export function frequencyToNote(frequency: number): NoteMatch {
  const midiFloat = A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { name, octave, cents, midi };
}

/** The exact 12-TET frequency for a given MIDI note number. */
export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Signed cents offset of `frequency` from the nearest occurrence (in any
 * octave) of `noteName` — used when a target note is pinned, so the reading
 * is measured against the string you're actually tuning rather than
 * whichever note the raw frequency happens to be closest to. If the string
 * is very out of tune, that nearest occurrence may still be far away in
 * cents; the caller is responsible for deciding how to display that.
 */
export function centsFromNote(frequency: number, noteName: string): number {
  const targetPitchClass = NOTE_NAMES.indexOf(noteName);
  if (targetPitchClass < 0) return 0;
  const midiFloat = A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
  const roundedMidi = Math.round(midiFloat);

  let bestMidi = roundedMidi;
  let bestDistance = Infinity;
  // A full octave of slack in each direction guarantees at least one
  // candidate MIDI number matches the target pitch class.
  for (let delta = -12; delta <= 12; delta++) {
    const candidate = roundedMidi + delta;
    if (((candidate % 12) + 12) % 12 === targetPitchClass) {
      const distance = Math.abs(midiFloat - candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMidi = candidate;
      }
    }
  }

  return Math.round((midiFloat - bestMidi) * 100);
}
