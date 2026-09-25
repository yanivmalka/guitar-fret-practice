# Staff Reading — Design Specification

Status: **Slice 1 built and shipped (2026-09-25).** The product owner asked to
add staff reading and left the design to Claude ("התחל כראות עיניך"). This
document records what Slice 1 is, the decisions it rests on, and what is
deliberately left for later (§11), so it can be reviewed and steered from here.

## 0. Foundational principle

Staff reading is its **own learning domain**, a sibling of Intervals and
Scales, not a mode of the Notes Selector and not blended into another domain
(premium-product-plan.md §4: "Staff reading only needs pitch↔name and is
otherwise independent — an independent track"). It has its own screen, its own
engine, its own SRS lane and its own history. It is Premium, like every other
new content domain (premium-product-plan.md §2: "New content domains … are
Premium only").

## 1. Product definition

The learner sees **one note written on the staff** of their own instrument and
answers it in one of two ways:

- **Name the note** — pick its name from a chip row. The note plays after the
  answer, right or wrong, so the written note, its name and its sound connect.
- **Find it on the neck** — tap a place on the neck that plays that exact
  pitch. Any string counts. After the answer every place that plays it is
  shown in green, so the learner sees all the places the note lives.

The second exercise is the real point for a guitarist: it links the page to
the instrument, which is the gap other reading apps (piano-centred) leave.

Not in Slice 1: reading a short melody (several notes in a row), key
signatures, rhythm, the reverse exercise (a fret is marked → where is it on
the staff). See §11.

## 2. Where it lives

- `LearnHub` tile **Staff reading** (📖), `LearnDomain` `'staff'`, locked
  for non-Premium users (opens the upgrade page), replacing the inert
  "coming soon" tile.
- `App.tsx` renders `StaffPracticeScreen` as a second home screen, exactly
  like the Scales branch (self-contained, no `DrillConfig` handed back).
- Feature flag `staffReading: 'premium'` in `src/utils/features.ts`.

## 3. Staff theory (`src/utils/staff.ts`, pure)

- Staff positions count diatonic steps from the **bottom line** (0), one per
  line or space; 8 is the top line. Treble bottom line = E4, bass bottom
  line = G2.
- Ledger lines: every even position from −2 downward / from 10 upward, up to
  and including the note's own.
- **Clef per instrument** (`staffSpecFor`):
  - guitar, banjo — treble clef, written **one octave above** the sound, with
    the small 8 under the clef;
  - bass — bass clef, written one octave above the sound;
  - mandolin, ukulele — treble clef at pitch.
  The screen states this in one line of help text, because it is the first
  thing that confuses a guitarist reading the staff.
- **Spelling** of a black key follows the app-wide sharps/flats setting
  (C♯ sits on C's place with a ♯; D♭ on D's place with a ♭) — the
  cross-cutting settings rule. Chip labels follow the notation setting
  (A-B-C / Do-Re-Mi).

## 4. Item identity (`src/learning/staffItem.ts`)

`staff:<sounding MIDI>`. The clef is fixed per instrument and the learning
state is already per instrument, so the pitch alone identifies "the G on the
second line". Spelling is display only and is not part of the item.

## 5. Pool (`src/learning/staffDrill.ts`)

Every pitch playable in frets 0…top on any string (respecting banjo's short
fifth string via `minFrets`), each with all its positions. Two controls,
persisted in `localStorage` (`staff_range`, `staff_naturalsOnly`, plus
`staff_exercise`):

- **Range:** frets 0–3 (open position, the default), 0–5, 0–12. On guitar
  0–12 spans written E3…E6 — at most 4 ledger lines each way, which the
  renderer's box is sized for (checked by `scripts/check-staff.mts` for every
  instrument).
- **Notes:** natural notes only (default) / with sharps and flats.

## 6. Exercises (`src/hooks/useStaffEngine.ts`)

One small dedicated engine, a sibling of `useScaleChipEngine` (the prompt is a
written pitch and "find it" wants an exact pitch, not a pitch class, so the
shared `useGameEngine` does not fit). 12 questions per session; 10 s per
question for *name*, 15 s for *find* (the usual `useScoring` speed/streak
scoring applies). A timeout counts as wrong.

### 6.1 Name the note
Chips: the 7 naturals, or all 12 when sharps/flats are on (reuses
`IntervalChoiceRow`). Correct = same pitch class.

### 6.2 Find it on the neck
`StaffNeckBoard`: frets 0…top, lowest string on top like every other neck,
**blank tiles** (names would give the answer away), open-string names on the
side, fret numbers below with the inlay frets bold. Reuses ScaleOrderBoard's
grid styling and its left-handed mirroring. Correct = exactly the written
pitch (octave matters), on any string.

## 7. Picking

`pickStaffQuestion` weights the pool by the staff SRS: due → 4, never seen →
3, known and not due → 1; never the same pitch twice in a row. It reads the
schedule fresh on every question, so a miss early in a session brings that
note back later in the same session (after the SRS lapse delay).

## 8. Persistence

`InstrumentLearningState` gains `staffSrs` (Leitner, same `srs.ts`) and
`staffHistory` (capped ring buffer of 200, form `nameNote` / `findOnNeck`),
with normalise / merge helpers mirroring the scale ones. **Local only for
now**, exactly like `scaleSrs` / `scaleHistory`: `learningSync.ts` does not
carry them yet. Nothing here touches note history, mastery, badges, the
leaderboard or personal bests.

## 9. Rendering (`src/components/StaffNotation.tsx`)

A self-contained SVG: five lines, the clef drawn as **paths** (no music font
— the U+1D11E glyph is missing on many Android WebViews), a filled note head
with a stem (up below the middle line, down from it), ledger lines, and a ♯/♭.
The note turns green / red after the answer. Staff notation always reads left
to right: the SVG is pinned LTR (also against a Hebrew page, where
`direction` would flip SVG `text-anchor`) and is **not** mirrored by the
left-handed setting — that setting mirrors the instrument, and a staff is not
part of it. CSS: `src/styles/32-staff-reading.css`.

## 10. Verification

- `node --experimental-strip-types scripts/check-staff.mts` — staff positions
  in both clefs with sharps and flats, ledger lines, per-instrument octave
  shift, every pool position plays its pitch, every pool note fits the
  renderer, the picker never repeats and favours due notes.
- Live in a browser (Playwright, 400×860, Premium simulated): guitar and bass,
  English and Hebrew — both exercises answered, answers reach `staffSrs` /
  `staffHistory`, no console errors.

## 11. Next slices (not built)

In rough priority order; also listed in `product-wishlist.md` §0.C.

1. **Progress board** — a Progress tab like Scales/Intervals: every note in
   range with not started / learning / mastered, from `staffSrs` +
   `staffHistory`.
2. **Cloud sync** of `staffSrs` / `staffHistory` (together with the scale
   fields, which are in the same state).
3. **Reverse exercise** — a place on the neck is marked; tap where it is
   written on the staff.
4. **Read a phrase** — 4–8 notes in a row, play/tap them in order (pairs with
   future guitar-audio answering: "play what you read").
5. Higher positions beyond fret 12, and a **key signature** stage.
6. Daily / Teacher integration (a staff daily goal), like the other domains.
