// ── Calibration noise gate ────────────────────────────────────────────
//
// Calibration records only automatically (no manual "Record" tap), so a
// cough, a chair scrape or room noise can be captured and saved as if it
// were a spoken word. Before a take is added to the personal profile it is
// checked against the bundled "general" reference set.
//
// Calibration stores nine isolated single-word takes — the seven natural
// letters and the two accidental words ("sharp"/"flat", "dièse"/"bémol").
// The runtime recogniser later splits a spoken "C sharp" into those two
// pieces and matches each; the gate mirrors that by checking each take
// against the matching general set:
//
//   • a letter take   -> the general natural-letter templates
//   • an accidental take -> the general "sharp"/"flat" word templates
//
// The bar is deliberately loose. Adjacent letters (B, E, G, D) — and
// "sharp" vs "dièse" — sound alike even to a good recogniser, and a strict
// gate that makes the user repeat words is worse than the occasional noisy
// template, since the profile only ever matches that same user's voice. We
// only want to drop captures that don't look like speech at all, so the
// take is compared against *every* token in the relevant set, not just its
// own label.

import { framesFromJson } from './mfcc';
import { matchTemplates, type Template } from './dtw';
import { isLetterLabel, isAccidentalLabel, baseVocabId } from './voiceProfileVocab';
import { vlog } from './debugLog';

// Length-normalised DTW distance (see `dtw.ts`) to the nearest reference
// token. Above this the capture is treated as noise. Tunable:
//   localStorage.voiceCalGateMax = '45'
// Loose on purpose (see file header). Watch the "[voice] cal gate" debug
// lines and lower it only if noise is getting through.
const DEFAULT_MAX = 45;

function gateMax(): number {
  try {
    const v = parseFloat(localStorage.getItem('voiceCalGateMax') ?? '');
    if (!Number.isNaN(v) && v > 0) return v;
  } catch { /* ignore */ }
  return DEFAULT_MAX;
}

// Reference sets in `generalVoiceTemplates`. The `accidentals-*` sets are
// populated once isolated "sharp"/"flat"/"dièse"/"bémol" WAVs are added to
// the offline build (`scripts/build-general-voice.mts`); until then they
// are absent/empty and accidental takes are simply not gated.
type SetKey =
  | 'notes-alpha' | 'notes-solfege'
  | 'accidentals-alpha' | 'accidentals-solfege';

const cache = new Map<SetKey, Template[]>();

async function refSet(key: SetKey): Promise<Template[]> {
  const hit = cache.get(key);
  if (hit) return hit;
  const mod = await import('./generalVoiceTemplates');
  const all = mod.default as Record<string, { label: string; frames: number[][] }[]>;
  const rows = all[key] ?? [];
  const templates = rows
    // The `notes-*` sets also hold whole-word sharp names ("C#" = "C sharp");
    // for a bare-letter take keep only the natural letters.
    .filter((r) => (key.startsWith('notes-') ? isLetterLabel(r.label) : true))
    .map((r) => ({ label: r.label, frames: framesFromJson(r.frames) }));
  cache.set(key, templates);
  return templates;
}

/**
 * True when `frames` (the MFCC of a fresh calibration capture for `label`
 * in `vocabId`) resembles a spoken word closely enough to keep. Returns
 * `true` without gating whenever there is no bundled reference for that
 * label/notation.
 */
export async function resemblesSpokenNote(
  frames: Float32Array[],
  label: string,
  vocabId: string,
): Promise<boolean> {
  if (!frames.length) return false;

  const notation = baseVocabId(vocabId) === 'notes-solfege' ? 'solfege' : 'alpha';
  let key: SetKey | null = null;
  if (isLetterLabel(label)) key = `notes-${notation}`;
  else if (isAccidentalLabel(label)) key = `accidentals-${notation}`;
  if (!key) return true;

  const templates = await refSet(key);
  if (!templates.length) return true; // no reference yet — can't gate

  const best = matchTemplates(frames, templates)[0];
  const pass = !!best && Number.isFinite(best.distance) && best.distance <= gateMax();
  vlog('[voice] cal gate', {
    label, key,
    nearest: best ? { label: best.label, d: +best.distance.toFixed(2) } : null,
    max: gateMax(),
    pass,
  });
  return pass;
}
