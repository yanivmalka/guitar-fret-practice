// ── intervalContent.ts — per-quality educational copy (data, i18n keys) ──
//
// Intervals Learning spec §7. One record per drilled interval quality
// (m2…M7). Every user-facing string here is an English key into
// `src/i18n/translations.ts` (app convention) and is surfaced INLINE only —
// the Selector's "?" summary and its collapsible "about this interval" line,
// the post-answer feedback for a missed question, the flat progress board
// rows. There is NO standalone theory screen (§1.2, §7).
//
// Pure data. Name / short label / semitone size already live in
// `src/utils/intervals.ts` INTERVALS and are not duplicated here.

export interface IntervalContent {
  /** Semitone size, 1 (m2) … 11 (M7) — the key shared with INTERVALS and the
   *  `interval:<n>` SRS id. */
  semitones: number;
  /** One line: what the interval is in plain words, including its size in
   *  semitones. */
  description: string;
  /** The one or two intervals it is most confused with, and the
   *  discriminator — phrased for the ear and for semitone counting
   *  (mirrors the §9.2 confuser pairs). */
  comparison: string;
  /** One sentence on its musical role / character. */
  role: string;
  /** Optional guitarist's shorthand for the shape on the neck. Reference
   *  colour only — tied to no MVP exercise (§7); omitted for the first
   *  release. */
  neckHint?: string;
}

export const INTERVAL_CONTENT: readonly IntervalContent[] = [
  {
    semitones: 1,
    description: 'One semitone — the smallest step, two adjacent frets; a tense, grinding sound.',
    comparison: 'One semitone narrower than a major 2nd — clashing and unstable where the major 2nd sounds like a plain step.',
    role: 'The pull of a leading tone up to the tonic; the clash inside a tone cluster.',
  },
  {
    semitones: 2,
    description: 'Two semitones — a whole step; the plain next note of a scale.',
    comparison: 'One semitone wider than a minor 2nd and one narrower than a minor 3rd — a plain step, neither harsh nor sweet.',
    role: 'The step between most neighbouring scale degrees.',
  },
  {
    semitones: 3,
    description: 'Three semitones — the minor colour; a small, slightly sad-sounding gap.',
    comparison: 'One semitone narrower than a major 3rd — that single semitone is what makes a chord sound minor instead of major.',
    role: 'The third of a minor chord.',
  },
  {
    semitones: 4,
    description: 'Four semitones — the major colour; a bright, open, happy-sounding gap.',
    comparison: 'One semitone wider than a minor 3rd and one narrower than a perfect 4th — bright where the minor 3rd sounds sad.',
    role: 'The bright third of a major chord.',
  },
  {
    semitones: 5,
    description: 'Five semitones — a strong, stable, slightly hollow consonance.',
    comparison: 'One semitone wider than a major 3rd and one narrower than a tritone — settled and resolved where the tritone is tense.',
    role: 'The sound of standard guitar tuning; root to fourth of a suspended chord.',
  },
  {
    semitones: 6,
    description: 'Six semitones — exactly half an octave; a tense, restless, unresolved sound.',
    comparison: 'One semitone wider than a perfect 4th and one narrower than a perfect 5th — tense and unresolved where both perfects sound stable.',
    role: 'The blue note; the gap inside a dominant 7th chord that wants to resolve.',
  },
  {
    semitones: 7,
    description: 'Seven semitones — the most stable interval after the octave; the power-chord sound.',
    comparison: 'One semitone wider than a tritone — solid and at rest where the tritone is tense.',
    role: 'Root to fifth of almost every chord; the power-chord shape.',
  },
  {
    semitones: 8,
    description: 'Eight semitones — a wide, wistful interval; a major 3rd turned upside down.',
    comparison: 'One semitone narrower than a major 6th — darker and more longing than the major 6th.',
    role: 'The top of a first-inversion major chord; root to the minor 6th degree.',
  },
  {
    semitones: 9,
    description: 'Nine semitones — a wide, warm, sweet interval; a minor 3rd turned upside down.',
    comparison: 'One semitone wider than a minor 6th and one narrower than a minor 7th — brighter and sweeter than either.',
    role: 'The added note of a 6th chord; root to the sixth degree of a major scale.',
  },
  {
    semitones: 10,
    description: 'Ten semitones — a wide, bluesy interval that leans forward and wants to resolve.',
    comparison: 'One semitone narrower than a major 7th and one wider than a major 6th — restless where the major 7th sounds sharp and the major 6th sounds settled.',
    role: 'The interval that makes a dominant 7th chord want to resolve.',
  },
  {
    semitones: 11,
    description: 'Eleven semitones — one short of the octave; a sharp, shimmering, almost-there sound.',
    comparison: 'One semitone wider than a minor 7th and one narrower than the octave — it strains up toward the octave where the minor 7th sits lower and bluesier.',
    role: 'The bright, jazzy top of a major 7th chord.',
  },
];

const BY_SEMITONES = new Map(INTERVAL_CONTENT.map((c) => [c.semitones, c]));

export function intervalContentBySemitones(semitones: number): IntervalContent | undefined {
  return BY_SEMITONES.get(semitones);
}
