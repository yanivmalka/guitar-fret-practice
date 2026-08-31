// ── Spoken-answer vocabulary & normalisation ─────────────────────────────
//
// WP-1 of the voice-recognition feature. Pure, dependency-free string work:
// take the raw transcript a speech engine produced and turn it into a
// canonical note name (sharp spelling, e.g. "C#") or a fret number.
//
// The canonical note strings returned here are the same ones used in
// `music.ts`'s `notes` table, so callers should feed the result straight
// into `notesMatch()` rather than comparing strings directly — that keeps
// all enharmonic/notation handling in one place.

export type SpeechNotation = 'alpha' | 'solfege';

// ── Base-note token tables ──────────────────────────────────────────────
//
// Every key is a lowercased single token that a speech engine might emit
// for the given natural note. Includes common homophones and mis-hearings
// (English) plus a few Hebrew transliterations. Ambiguity between the two
// tables (e.g. "si" = Hebrew C in alpha, but Si = B in solfege) is resolved
// by consulting the table matching the active notation first.

const LETTER_TOKENS: Record<string, string> = {
  a: 'A', ay: 'A', aye: 'A', eh: 'A', hey: 'A', hay: 'A',
  b: 'B', be: 'B', bee: 'B', bea: 'B', bi: 'B',
  c: 'C', see: 'C', sea: 'C', ci: 'C', cee: 'C', si: 'C',
  d: 'D', dee: 'D', de: 'D', di: 'D', the: 'D', thee: 'D',
  e: 'E', ee: 'E', ea: 'E',
  f: 'F', ef: 'F', eff: 'F',
  g: 'G', gee: 'G', jee: 'G', ji: 'G', ji_: 'G',
  // Hebrew letter-name transliterations (best-effort)
  'אֵי': 'A', 'איי': 'A',
  'בי': 'B',
  'סי': 'C',
  'די': 'D',
  'אף': 'F', 'אפ': 'F',
};

const SOLFEGE_TOKENS: Record<string, string> = {
  do: 'C', doe: 'C', dough: 'C', doh: 'C', 'דו': 'C',
  re: 'D', ray: 'D', rey: 'D', 'רה': 'D', 'רא': 'D',
  mi: 'E', me: 'E', mee: 'E', 'מי': 'E',
  fa: 'F', fah: 'F', far: 'F', 'פה': 'F', 'פא': 'F',
  sol: 'G', so: 'G', soul: 'G', sole: 'G', 'סול': 'G',
  la: 'A', lah: 'A', 'לה': 'A', 'לא': 'A',
  si: 'B', ti: 'B', tea: 'B', tee: 'B', 'סי': 'B',
};

// ── Accidental tokens ──────────────────────────────────────────────────

const SHARP_TOKENS = new Set([
  'sharp', 'sharpe', 'sharps', 'diez', 'diese', 'dièse', 'diesis',
  'דיאז', 'דייז', 'שארפ',
]);
const FLAT_TOKENS = new Set([
  'flat', 'flatt', 'flats', 'bemol', 'bémol', 'bmol',
  'במול', 'פלאט',
]);
const NATURAL_TOKENS = new Set([
  'natural', 'naturale', 'בקר', 'טבעי',
]);

// Words a speaker may pad the answer with — dropped before parsing.
// Deliberately excludes short strings that collide with note tokens
// ("a", "the", "so", "me", …).
const FILLER_TOKENS = new Set([
  'note', 'is', 'its', 'um', 'uh', 'er', 'the', 'answer',
  'i', 'think', 'maybe', 'like',
  'אה', 'זה', 'התו', 'הוא', 'נראה', 'לי',
]);

// Enharmonic collapse: letter + accidental → canonical sharp spelling
// used by the `notes` table.
const FLAT_TO_SHARP: Record<string, string> = {
  A: 'G#', B: 'A#', C: 'B', D: 'C#', E: 'D#', F: 'E', G: 'F#',
};
const SHARP_WRAP: Record<string, string> = {
  'E#': 'F', 'B#': 'C',
};

// ── Number tokens (fret answers) ───────────────────────────────────────

const ONES: Record<string, number> = {
  zero: 0, oh: 0, nought: 0, open: 0, 'אפס': 0, 'פתוח': 0, 'פתוחה': 0,
  one: 1, won: 1, 'אחת': 1, 'אחד': 1,
  two: 2, to: 2, too: 2, 'שתיים': 2, 'שתים': 2, 'שניים': 2,
  three: 3, tree: 3, 'שלוש': 3, 'שלושה': 3,
  four: 4, for: 4, fore: 4, 'ארבע': 4, 'ארבעה': 4,
  five: 5, 'חמש': 5, 'חמישה': 5,
  six: 6, sicks: 6, 'שש': 6, 'שישה': 6,
  seven: 7, 'שבע': 7, 'שבעה': 7,
  eight: 8, ate: 8, 'שמונה': 8,
  nine: 9, 'תשע': 9, 'תשעה': 9,
};
const TEENS: Record<string, number> = {
  ten: 10, 'עשר': 10, 'עשרה': 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20 };

const MAX_FRET = 24;

// ── Tokeniser ─────────────────────────────────────────────────────────

function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .normalize('NFC')
    // keep letters (incl. Hebrew), digits and the sharp sign; everything
    // else becomes a separator
    .replace(/[^0-9a-z֐-׿#]+/g, ' ')
    // "c#" → "c #"
    .replace(/#/g, ' # ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 1) return 2; // caller only cares about <= 1
  const prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[n];
}

// Resolve one token to a base letter, trying `primary` table first then the
// other, with a length-guarded fuzzy fallback for words (>= 3 chars).
function resolveBase(token: string, notation: SpeechNotation): string | null {
  const primary = notation === 'solfege' ? SOLFEGE_TOKENS : LETTER_TOKENS;
  const secondary = notation === 'solfege' ? LETTER_TOKENS : SOLFEGE_TOKENS;
  if (primary[token]) return primary[token];
  if (secondary[token]) return secondary[token];
  if (token.length >= 3) {
    for (const table of [primary, secondary]) {
      for (const key of Object.keys(table)) {
        if (key.length >= 3 && levenshtein(token, key) <= 1) return table[key];
      }
    }
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Parse a spoken note answer into a canonical note name ("C", "F#", …),
 * or `null` if nothing note-like was heard. Accepts either token order
 * ("c sharp" / "sharp c") and ignores filler words.
 */
export function parseSpokenNote(
  transcript: string,
  notation: SpeechNotation = 'alpha',
): string | null {
  const tokens = tokenize(transcript).filter(t => !FILLER_TOKENS.has(t));
  let base: string | null = null;
  let accidental: '' | '#' | 'b' | 'natural' = '';

  for (const token of tokens) {
    if (token === '#' || SHARP_TOKENS.has(token)) { accidental = '#'; continue; }
    if (FLAT_TOKENS.has(token)) { accidental = 'b'; continue; }
    if (NATURAL_TOKENS.has(token)) { accidental = 'natural'; continue; }
    const b = resolveBase(token, notation);
    if (b && !base) base = b;
  }

  if (!base) return null;
  if (accidental === '' || accidental === 'natural') return base;
  if (accidental === '#') {
    const sharp = `${base}#`;
    return SHARP_WRAP[sharp] || sharp;
  }
  // flat
  return FLAT_TO_SHARP[base] || base;
}

/**
 * Parse a spoken fret answer into an integer in [0, MAX_FRET], or `null`.
 * Handles digits ("7"), number words ("seven"), "open"/"פתוח" for 0, and
 * two-word compounds ("twenty one").
 */
export function parseSpokenFret(transcript: string): number | null {
  const tokens = tokenize(transcript).filter(t => !FILLER_TOKENS.has(t));

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    if (/^\d{1,2}$/.test(t)) {
      const n = parseInt(t, 10);
      if (n >= 0 && n <= MAX_FRET) return n;
      continue;
    }
    if (t in ONES) return ONES[t];
    if (t in TEENS) return TEENS[t];
    if (t in TENS) {
      const next = tokens[i + 1];
      if (next && next in ONES && ONES[next] >= 1 && ONES[next] <= 9) {
        return TENS[t] + ONES[next];
      }
      return TENS[t];
    }
  }
  return null;
}

// ── Vocabulary export (for SpeechGrammarList / diagnostics) ────────────

/** Flat list of every phrase the recogniser should bias towards. */
export function speechVocabulary(notation: SpeechNotation): string[] {
  const bases = Object.keys(notation === 'solfege' ? SOLFEGE_TOKENS : LETTER_TOKENS)
    .filter(k => !/[֐-׿]/.test(k));
  const accidentals = ['sharp', 'flat'];
  const phrases = new Set<string>(bases);
  for (const base of bases) {
    for (const acc of accidentals) phrases.add(`${base} ${acc}`);
  }
  for (let f = 0; f <= MAX_FRET; f++) phrases.add(String(f));
  phrases.add('open');
  return [...phrases];
}

export { MAX_FRET as SPEECH_MAX_FRET };
