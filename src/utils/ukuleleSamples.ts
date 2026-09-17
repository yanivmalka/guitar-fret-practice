// Real recorded ukulele samples from the FreePats project (CC0 — public
// domain, see public/audio/ukulele/CREDIT.txt), 13 pitched notes spanning
// C4–C6. Unlike the other instruments' soundfont (one exact sample per
// chromatic note), this set only has one sample every 1–3 semitones — each
// file is pitch-shifted at playback to cover its neighbours, exactly as the
// original release's own SFZ instrument-definition file maps it (see the
// comment above each entry, transcribed 1:1 from that file).
export interface SampleRegion {
  /** File under public/audio/ukulele/, without extension */
  file: string;
  /** SFZ pitch_keycenter — the MIDI note this sample was recorded at */
  keycenter: number;
  /** SFZ tune (cents) — a small correction for the source recording being
   *  very slightly off from the nominal pitch */
  tuneCents: number;
  /** SFZ lokey/hikey — the MIDI range this one sample covers */
  lokey: number;
  hikey: number;
}

export const UKULELE_SAMPLES: SampleRegion[] = [
  { file: 'C4',  keycenter: 60, tuneCents: -5,  lokey: 58, hikey: 60 },
  { file: 'D4',  keycenter: 62, tuneCents: -8,  lokey: 61, hikey: 62 },
  { file: 'E4',  keycenter: 64, tuneCents: -2,  lokey: 63, hikey: 64 },
  { file: 'Gb4', keycenter: 66, tuneCents: -11, lokey: 65, hikey: 66 },
  { file: 'G4',  keycenter: 67, tuneCents: -1,  lokey: 67, hikey: 67 },
  { file: 'A4',  keycenter: 69, tuneCents: 0,   lokey: 68, hikey: 69 },
  { file: 'B4',  keycenter: 71, tuneCents: 0,   lokey: 70, hikey: 71 },
  { file: 'Db5', keycenter: 73, tuneCents: 0,   lokey: 72, hikey: 73 },
  { file: 'Eb5', keycenter: 75, tuneCents: 3,   lokey: 74, hikey: 75 },
  { file: 'F5',  keycenter: 77, tuneCents: 4,   lokey: 76, hikey: 77 },
  { file: 'G5',  keycenter: 79, tuneCents: 6,   lokey: 78, hikey: 79 },
  { file: 'A5',  keycenter: 81, tuneCents: 8,   lokey: 80, hikey: 82 },
  { file: 'C6',  keycenter: 84, tuneCents: 4,   lokey: 83, hikey: 86 },
];

/**
 * The sample file to fetch for a given MIDI note, or null if `midi` falls
 * outside every mapped region (shouldn't happen for any note the ukulele
 * fretboard can actually produce — see the range check in instruments.ts).
 */
export function findUkuleleRegion(midi: number): SampleRegion | null {
  return UKULELE_SAMPLES.find(r => midi >= r.lokey && midi <= r.hikey) ?? null;
}

/**
 * Extra playback-rate multiplier to layer on top of a fetched region's
 * sample so it lands exactly on `midi` (1.0 = no correction needed, i.e.
 * `midi` IS the sample's own recorded pitch).
 */
export function ukulelePitchRatio(midi: number): number {
  const region = findUkuleleRegion(midi);
  if (!region) return 1;
  const semitones = (midi - region.keycenter) + region.tuneCents / 100;
  return Math.pow(2, semitones / 12);
}
