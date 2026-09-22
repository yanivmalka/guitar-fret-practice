# Scales Learning — Design Specification

Status: **design resolved (§17), scope confirmed by the product owner,
Slice 1 (Minor Pentatonic) implementation IN PROGRESS — see "Session 1
progress" below before writing more code.** This document was drafted by
mirroring the shipped Intervals Learning domain (§0–§3 below explain how) so
it could be reviewed against a concrete precedent rather than from a blank
page.

## Session 1 progress (2026-09-22) — read this before continuing

**Built and shipped to `main`, in this order (4 commits):**

1. **Data layer** (§4) — `src/utils/scales.ts` (`SCALE_TYPES` with only
   `minorPentatonic` so far, `stepPattern`, `scalePositionsFor`,
   `shapeAtRoot`) and `src/learning/scaleItem.ts` (`scale:<type>:<position>`
   id). Verified by `scripts/check-scales.mts` (21 checks, guitar + bass).
2. **Exercise A question picking** — `src/learning/scaleDrill.ts`
   (`buildScalePool`, `pickScaleQuestion`: picks a `(scaleType, position)` +
   a root fret and resolves the concrete shape). Verified by
   `scripts/check-scale-drill.mts` (16 checks incl. 200-draw randomised
   stress on guitar + bass).
3. **A new engine + answer surface** (see the "§8.1 correction" below) —
   `src/hooks/useScaleDrillEngine.ts` (dedicated session/timer/scoring
   runner, reuses `useScoring` + `audio.ts`/`feedback.ts`) and
   `src/components/ScaleShapeBoard.tsx` (the "piano tiles" multi-string
   board + `src/styles/30-scale-board.css`). Verified in a real browser
   (dev server + Playwright) via `scale-spike.html` — a standalone harness
   page, same pattern as the existing `pitch-spike.html` — before and after
   fixing a real bug found there (see below).
4. **Wired into the real app** — `scaleDrill` feature key in
   `src/utils/features.ts` (Premium, mirrors `intervalDrill`); a live
   "Scales" tile in `LearnHub.tsx` (`LearnDomain` gained `'scales'`,
   replacing the old inert "coming soon" placeholder); a new
   `ScalePracticeScreen.tsx`; a render branch in `App.tsx` right after the
   Intervals one. Verified end-to-end in a real browser: drawer → Learn →
   Scales tile (unlocked with `devSimulateTier` forced to `'premium'`) →
   Scale training screen → Start → the board renders and taps register
   inside the actual app, zero console errors.

**Important correction to §2 / §8.1 — read before assuming any more "free"
reuse.** §8.1 claimed Exercise A needs **no new engine capability** because
it could reuse the existing `byNote` + `candidates` flow (`FretGrid` +
`useGameEngine`'s `remainingFrets`/`foundFrets`). **This turned out to be
false, verified by reading the code and then confirming live in a browser:**
`FretGrid` renders exactly **one string** per question, and when a candidate
set is active `useGameEngine.nextByNote` narrows every question to **one
string + one specific note name** (`allFretsForNote = validFrets.filter(f
=> notesMatch(notes[qString-1][f], note))` — every candidate frets on *that
string* that share *that note's name*, nothing else). A scale shape spans
several strings with several different note names — that flow cannot
render or answer it. Building the multi-string "piano tiles" board
(`ScaleShapeBoard.tsx`) as a genuinely new, self-contained capability — with
its own dedicated engine (`useScaleDrillEngine.ts`) rather than any change to
the shared ~1000-line `useGameEngine` — was necessary and is now done. A
second bug was caught and fixed the same way (browser-verified): the first
version of the board only rendered true shape members as tappable, so a
question had no way to be answered wrong; it now renders every fret in the
window, decoys included, exactly like `FretGrid` does for its filter range.
**Any future increment that assumes "free" reuse from the Notes/Intervals
mapping table in §2 should be re-verified the same way (read the actual code
path, then confirm live in a browser) before being taken on faith.**

**Not built yet — next steps, in a sensible order:**

1. **Selector controls (§5).** `ScalePracticeScreen` currently has no
   picker at all — it always runs Minor Pentatonic, all positions, a fixed
   10-question/14s envelope. Needs `useScaleSelector.ts` (mirrors
   `useIntervalSelector.ts`) plus the exercise/scale/position/difficulty
   controls §5.1–§5.6 describe, once there is more than one scale type and
   exercise to choose between.
2. **Exercises B and C (§8.2/§8.3)** — "identify the scale" (chip row) and
   "name the degree" (note-chip row). These two genuinely *are* cheap reuse
   (chip-row answer surfaces, no new board), unlike Exercise A — good
   candidates for the next session.
3. **SRS + weakness + mastery (§10/§11)** — `scaleSrs` in
   `InstrumentLearningState`, `scaleWeakness.ts`, `scaleMastery.ts`. Right
   now a session's score is thrown away when the screen closes; nothing is
   tracked.
4. **Progress board (§12)** — the flat, grouped-by-scale-type board.
5. **Daily/Teacher integration (§13/§14)**, **persistence/cloud sync
   (§15)** — `scaleSrs`/`scaleDaily`/`scaleHistory` fields in
   `learningState.ts` + `learningSync.ts`.
6. **Curriculum ordering (§6)** and **per-scale content (§7)** —
   `scaleCurriculum.ts`, `scaleContent.ts` — only matter once a second scale
   type ships (§4.2's "2nd" row, Major Pentatonic).
7. Only once the above are solid: ship scale type 2 (Major Pentatonic) as
   the close-to-pure-data addition §4.2 describes — a new `SCALE_TYPES` row
   in `scales.ts` + a `SCALE_POSITION_SPECS` pair + its `scaleContent.ts`
   entry.

Nothing in `src/` outside the files named above is changed by this
document.

**Ships incrementally, one scale type per implementation session — start
with §4.2's "1st" row (Minor Pentatonic) only, build the whole generic
system for it, then treat every later row as a data-only addition.** This is
a product-owner decision, not a fallback: "we'll start with the most basic
scales and gradually work through the next ones until everything is mapped."
Each future implementation session should re-read this document in full
before writing code, rather than relying on memory of this conversation.
Triads (`premium-product-plan.md` P5's other half) are explicitly **out of
scope** of this document and are not folded into it.

Reference documents:
- `intervals-learning-spec.md` — the domain this spec is structurally copied
  from, section for section. Read alongside this one; most "why" reasoning
  that also applies to scales is not repeated here.
- `premium-product-plan.md` §4 (prerequisite graph — "Scales need notes; go
  faster after intervals but do not strictly require them"), §9 P5 ("Scales &
  triads — build on P4's proven pattern").
- `product-wishlist.md` §6 — the original flat "new game modes: … scales …"
  entry this design supersedes with the one-engine framing.

---

## 0. Foundational principle — same as Intervals

Two independent systems exist in the app: **Learning** (the adaptive teacher)
and **Game** (`src/game/**` — points, stars, Worlds). This spec concerns
**Learning only**, and inherits every constraint `intervals-learning-spec.md`
§0 states for Intervals: no points/combo/stars/XP, no Worlds/Stages, no
checkpoint ladder unless explicitly decided otherwise below.

Scales Learning is a **sibling** of Notes and Intervals, not a layer on top of
either. It has its own item identity, its own SRS map, its own weakness
analysis, its own internal curriculum ordering, its own daily planner slice,
its own flat progress view, its own translation keys. It **shares** the drill
runner, the Leitner SRS engine, the persistence blob + cloud sync mechanism,
the scoring/feedback/haptics infra, the full-page/card UI shells, and the
entitlement gate — exactly the reuse list `intervals-learning-spec.md` §1.3
gives for Intervals.

Gate: a new `scaleDrill` feature key in `src/utils/features.ts`, `MIN_TIER:
'premium'`, following the `intervalDrill` pattern exactly (§16 below).

---

## 1. Product definition

### 1.1 What Scales Learning is

Guitarists think of a scale as a **shape on the neck**, not an abstract list
of scale-degree names — that is the one place this domain must diverge from
Intervals' quality-only abstraction, and it is also the app's natural
strength: the whole codebase already centres on `(string, fret)` positions.

By working through it the learner should be able to:

- know the five core scale/mode shapes drilled (§4.2) and where each sits
  relative to a root note;
- **build a scale from a given root** — given a scale name and a root note
  (or a marked root position), tap every note of that scale inside one neck
  position (reuses the existing multi-fret "by note" mechanic — §8.1);
- **recognise a scale shape by ear** — hear it played as an ascending run and
  name which scale it is (mirrors Intervals Exercise A — §8.2);
- **name a scale degree** — given a scale + root, name the note that is its
  Nth degree (e.g. "the 3rd degree of G major pentatonic") — a direct
  generalisation of Intervals Exercise B, since a scale degree *is* an
  interval above the root (§8.3);
- begin to associate a scale's sound with its name and its "box" shape on the
  neck, and see how the same shape moves for different roots;
- **understand a scale as a formula of whole and half steps from the root**,
  not a fixed, memorised picture — and be able to say why moving the same
  formula to a different root produces "the same scale in a different key"
  (§1.4). This is the one piece of understanding every learner must come away
  with, independent of which of the three exercises they are running.

Full fretboard-wide scale fluency (playing a scale correctly starting from
*any* fret, or connecting boxes across the neck) is **not** an MVP goal — see
§8.5 Future Extensions, exactly mirroring how Intervals deferred a full neck
trainer.

### 1.2 What it is not

- Not a modal-theory course. No key-signature spelling, no circle-of-fifths
  derivation of modes, no chord-scale-theory screens. Per-scale content is
  short, inline, optional (§7).
- Not a re-imagined UX. Reuses the Notes/Intervals surfaces and rhythm
  (choose → practise → feedback → review → progress) wherever they fit.
- Not a Game mode. No stars, points, combos, XP, or achievements.
- Not (in the MVP): fingering/technique guidance, multi-position "connect the
  boxes" drilling, scale-over-chord application exercises, modes beyond the
  five in §4.2, or a "which scale fits this chord" exercise. Catalogued as
  Future Extensions (§8.5).

### 1.3 Relationship to Notes and Intervals Learning

Scales sits **after** Intervals in the prerequisite graph
(`premium-product-plan.md` §4: "Scales need notes; go faster after intervals
but do not strictly require them") because a scale degree is explained to the
learner in interval terms ("the 3rd degree is a major or minor 3rd above the
root") wherever that helps, but Scales Learning does **not** require the
learner to have touched Intervals Learning first — it is a free-standing
Selector-gated domain like Intervals is, with its own entry card.

### 1.4 Foundational concepts every learner must come away understanding

This is the conceptual payload the whole domain exists to deliver — everything
in §5–§13 (Selector, exercises, curriculum, content) is a delivery mechanism
for it, not an end in itself. Every scale, in any key, on any instrument, is
built from exactly three ideas:

1. **The root (tonic)** — the note a scale is named after and built from. It
   is the note that makes a phrase sound "finished" when it lands there. "C
   major" is the major-scale formula (below) applied starting from C; "A
   minor" is the natural-minor formula applied starting from A. The app
   already has this concept fully worked out for Notes and Intervals (every
   fret has a name); Scales Learning's job is to connect it to "and a scale
   is just a formula counted off from one."
2. **The octave** — the point where a scale's pattern repeats: the note with
   the same name as the root, at double its frequency. A scale is defined
   over one octave and then repeats identically in the next.
3. **Whole step and half step** — the only two distances between consecutive
   notes of a Western scale. The app must reuse, not reinvent, the language
   Intervals Learning already establishes: a **half step** is exactly a
   Minor 2nd (1 semitone) and a **whole step** is exactly a Major 2nd (2
   semitones) — `intervalContent.ts` already describes the Major 2nd as "a
   whole step; the plain next note of a scale" (§2 mapping table). Scale
   content should say this explicitly ("a whole step is what Intervals
   Learning calls a Major 2nd") wherever a learner meets both domains, so the
   two reinforce each other instead of teaching the same idea twice with
   different words.

**The formula.** A scale type is nothing more than a fixed sequence of whole
(W) and half (H) steps, counted off from whichever root is chosen. The
sequence is what makes a scale *that* scale — the root only decides where it
starts:

- **Major scale**: W–W–H–W–W–W–H. From C: C, D, E, F, G, A, B, (C).
- **Natural minor scale**: W–H–W–W–H–W–W. From A: A, B, C, D, E, F, G, (A).

The single most important thing the learner should take from this domain is
that **the same formula, started from a different root, gives the same scale
in a different key** — the formula is fixed, only the starting note moves.
This is exactly the "movable shape" intuition §3 below uses to justify the
item model (a shape moved to a different fret *is* the same formula counted
off from a different root), so the conceptual teaching and the technical
design reinforce one another rather than being two unrelated ideas bolted
together.

**Where this is taught (not a standalone theory screen — see §1.2):**
- The **"?" summary bubble** (§5.6), for any exercise, states the active
  scale's step formula in plain W/H notation alongside its name.
- **Per-scale content** (§7) states the formula, then a worked example from
  the scale's most natural root, spelled in **letter note names** (e.g. `A,
  C, D, E, G` for A minor pentatonic) — **never solfège** (`דו/רה/מי`), to
  match how every other note-facing surface in this app already writes note
  names (see `noteNameAtSemitones`, `INTERVALS`, and this repo's own
  convention of writing note names as letters).
- **Post-answer feedback**, on a miss, restates the formula and points out
  which step in it the missed note belongs to (e.g. "that's the H step
  between the 5th and 6th degree").
- The **progress board** (§12) — a "how scales are built" one-line link/
  disclosure, shown once, not repeated per row.

This section has no code deliverable of its own; it is the authoring brief
`scaleContent.ts` (§7) and `ScalePrompt.tsx` copy must satisfy, and the
measure of "sufficiency" (§8.4) that any exercise design must serve.

---

## 2. Notes/Intervals → Scales mapping

Same decision codes as `intervals-learning-spec.md` §3: **REUSE** (same code
unchanged) · **SHARED** (existing domain-agnostic seam, new caller) ·
**NEW-S** (new Scales-specific code, mirrors an existing domain) · **N/A** ·
**FUTURE**.

| Notes / Intervals | Scales | Decision | Detail |
|---|---|---|---|
| Note Item `(string,fret)` / Interval Item (quality) | Scale Item `(scaleType, position)` | **NEW-S** | §4. Root is a question property, not part of the item — mirrors how Intervals made direction a question property, not a second SRS key. |
| `DrillConfig.candidates` (`DrillPosition[]`) | Same field, populated per question from the scale's shape at the chosen root | **REUSE** | The exact seam `intervals-learning-spec.md` §2.1 calls "already the explicit item list seam." No new `DrillConfig` field needed for Exercise A (§8.1) — only a `scale` spec analogous to `interval` (§19). |
| Fret by Note (`mode:'byNote'`, `FretGrid`, `remainingFrets`/`foundFrets`) | **Exercise A — Build the scale**: tap every note of the shape | **REUSE (direct)** | This is the single biggest reuse win over Intervals: Intervals had *no* neck exercise in its MVP; Scales' primary exercise **is** the existing multi-fret find flow, unmodified, driven by an explicit `candidates` list computed from the shape + root. §8.1. |
| *(no Notes analogue)* — mirrors Intervals Exercise A | **Exercise B — Identify the scale**: hear it played ascending → pick the scale name from a chip row | **NEW-S (mirrors Intervals A)** | Reuses the sequential-playback capability built for Intervals Exercise A (`audio.ts` note-after-note) extended from 2 notes to N. §8.2. |
| Intervals Exercise B (`findTargetNote` — name the note an interval above a root) | **Exercise C — Name the degree**: given scale + root + degree number, pick the target note | **REUSE (direct)** | A scale degree is exactly an interval above the root; the interval-to-semitones table already exists (`INTERVALS` / `noteNameAtSemitones` in `src/utils/intervals.ts`). Degree → semitones is a lookup, computed from the scale's interval formula (§4.1). Reuses `buildTargetNoteOptions`, `noteNameAtSemitones`, `notesMatch`, and a note-chip answer row wholesale. §8.3. |
| `NoteCircle` | Answer surface for Exercise C (note-chip row, per Intervals OD-11 precedent) | **REUSE** | |
| `FretGrid` | Answer surface for Exercise A | **REUSE** | |
| Interval-chip row (built for Intervals Exercise A) | Scale-name chip row for Exercise B | **NEW-S (small)** | Same component shape as the interval chip row; different label set (5 scale names instead of 11 interval shorts). |
| `intervals.ts` (`INTERVALS`, `noteNameAtSemitones`, `positionMidi`, `targetPositionsForInterval`) | `scales.ts` (new, §4) | **NEW-S**, built **on top of** `intervals.ts` | A scale is defined as a list of interval-formula degrees (semitones from the root); `scales.ts` imports `intervals.ts`, does not duplicate it. |
| `intervalItem.ts` | `scaleItem.ts` | **NEW-S (mirrors)** | `scale:<scaleTypeId>:<positionIndex>`. §4.3. |
| `intervalDrill.ts` | `scaleDrill.ts` | **NEW-S (mirrors)** | Builds the `DrillConfig` with a `scale` spec; computes the concrete `candidates` for the chosen root + position + scale type. |
| `intervalCurriculum.ts` | `scaleCurriculum.ts` | **NEW-S (mirrors)** | §6. |
| `intervalContent.ts` | `scaleContent.ts` | **NEW-S (mirrors)** | §7. |
| `intervalMastery.ts` | `scaleMastery.ts` | **NEW-S (mirrors, own constants)** | §11. |
| `intervalWeakness.ts` | `scaleWeakness.ts` | **NEW-S (mirrors)** | §10.5. |
| `IntervalCard.tsx` / `IntervalPracticeScreen.tsx` / `IntervalPrompt.tsx` | `ScaleCard.tsx` / `ScalePracticeScreen.tsx` / `ScalePrompt.tsx` | **NEW-S (mirrors), reuses page shell** | §5.7, §16. |
| `useIntervalSelector` | `useScaleSelector` | **NEW-S (mirrors)** | §5. |
| `InstrumentLearningState.intervalSrs` / `intervalDaily` / `intervalHistory` | `scaleSrs` / `scaleDaily` / `scaleHistory` | **NEW-S (mirrors), same blob** | §15. |
| `useLearning.ts` interval bits (`intervalTrackedCount`, `recordIntervalAnswer`, `buildIntervalPlan`) | `scaleTrackedCount`, `recordScaleAnswer`, `buildScalePlan` | **NEW-S (mirrors)** | §13, §14. |
| `useDrillHistorySink` isolation (`intervalSink`, `wasIntervalRunRef`) | `scaleSink`, `wasScaleRunRef` | **REUSE (same pattern)** | Scale answers never touch note history/mastery/badges/leaderboard/personal-best, exactly like Intervals. |
| `LearnDomain = 'notes' \| 'daily' \| 'intervals'` | `LearnDomain` gains `'scales'` | **NEW-S (small)** | `LearnHub.tsx`. |
| `intervalDrill` feature key | `scaleDrill` feature key | **NEW-S (mirrors)** | `MIN_TIER.scaleDrill = 'premium'`. §16. |
| SRS (`srs.ts`), planner shell, mastery-status shell, `ProGate`, `click()`, countdown/`SpeedBar` timing | Same | **REUSE** | Fully domain-agnostic already; nothing here changes for Scales. |

---

## 3. Why the item is `(scaleType, position)`, not `(scaleType, root)`

This is the one modelling decision that has no Intervals precedent and needs
its own reasoning (Intervals' analogous choice was direction; here it is
root vs. shape).

A scale drilled "in G" and the same scale drilled "in D" are, to a guitarist,
**the same shape moved to a different fret** — exactly the "movable shape"
intuition the app already has no code for, because Notes and Intervals are
both key/root-agnostic by design. Two options:

- **(A) Item keyed on root** (`scale:major:G`) — 5 scale types × 12 roots = 60
  items (before positions). Mirrors "per-root granularity" that
  `intervals-learning-spec.md` §4.2 explicitly rejected for Intervals as a
  **Future** refinement, for the same reason: too many items for a first,
  visible, learnable SRS/progress board.
- **(B) Item keyed on neck position** (`scale:major:pos1`), root is a
  **question property** — 5 scale types × up to 5 positions = 25 items.
  Mirrors Intervals' actual decision (quality-only, root/direction left to
  the question generator).

**Proposed decision (mirrors OD-1's reasoning):** **(B)**. The root moves
every question (like Intervals' first note moves every question); what the
learner is actually building muscle memory for — and what SRS/mastery should
track — is "I know the minor pentatonic shape starting at the root, box 1",
regardless of which fret that box currently sits at. Root-per-item
granularity is catalogued as a Future refinement exactly as
`intervals-learning-spec.md` §4.2 catalogues per-root intervals, and could be
added later by extending `scaleItemId` without disturbing the schedule, same
escape hatch.

---

## 4. Scale content model

### 4.1 Scale type table (`src/utils/scales.ts`)

Mirrors `INTERVALS` in `intervals.ts`: a scale type is its **interval formula**
— the degrees' semitone distances from the root, ascending, using the
existing `IntervalDef`/semitone vocabulary so a scale degree can be rendered
through `noteNameAtSemitones` unchanged.

```ts
export interface ScaleTypeDef {
  id: string;            // 'majorPentatonic', 'minorPentatonic', 'major', 'naturalMinor', 'blues'
  nameKey: string;       // i18n key, e.g. 'Major Pentatonic'
  /** Ascending semitone offsets from the root, root itself omitted (always 0). */
  degrees: number[];     // e.g. minor pentatonic: [3, 5, 7, 10]
  degreeLabels: string[]; // display label per degree, e.g. ['1','b3','4','5','b7']
}

/** The W/H step pattern between consecutive degrees (root → d1 → d2 → … →
 *  octave), derived from `degrees` — never authored separately, so the
 *  formula shown to the learner (§1.4) can never drift from the semitone
 *  data the engine actually drills. `'W'` = 2 semitones, `'H'` = 1,
 *  `'W+H'` (a step-and-a-half, e.g. pentatonic/blues) rendered as its own
 *  glyph in the UI. */
export function stepPattern(scale: ScaleTypeDef): ('W' | 'H' | 'W+H')[] {
  const bounds = [0, ...scale.degrees, 12];
  return bounds.slice(1).map((n, i) => {
    const gap = n - bounds[i];
    return gap === 2 ? 'W' : gap === 1 ? 'H' : 'W+H';
  });
}
```

### 4.2 The scale-type catalogue and how it ships (revised — phased, not all-at-once)

**Product-owner decision (this session):** Scales Learning does **not** launch
with all five types at once. It ships **one scale type at a time**, starting
from the single most basic and useful one, and each later type is added as
its own follow-up — "we'll start with the most basic scales and gradually
work through the next ones until everything is mapped." Concretely, this
turns §6.1's teaching-order reasoning (originally described as an *internal*
ordering the Teacher consults, never shown as a path) into the literal
**build order** as well:

| Ship order | id | Name | Degrees (semitones from root) | Notes | Step formula | Example from its natural root |
|---|---|---|---|---|---|---|
| **1st (first shippable slice)** | `minorPentatonic` | Minor Pentatonic | 3, 5, 7, 10 | 5 | W+H–W–W–W+H–W | A, C, D, E, G, (A) |
| 2nd | `majorPentatonic` | Major Pentatonic | 2, 4, 7, 9 | 5 | W–W–W+H–W–W+H | C, D, E, G, A, (C) |
| 3rd | `blues` | Blues Scale | 3, 5, 6, 7, 10 | 6 | W+H–W–H–H–W+H–W | A, C, D, D#, E, G, (A) |
| 4th | `naturalMinor` | Natural Minor (Aeolian) | 2, 3, 5, 7, 8, 10 | 7 | W–H–W–W–H–W–W | A, B, C, D, E, F, G, (A) |
| 5th | `major` | Major (Ionian) | 2, 4, 5, 7, 9, 11 | 7 | W–W–H–W–W–W–H | C, D, E, F, G, A, B, (C) |

Rationale per row is unchanged from the original §4.2/§6.1 reasoning (minor
pentatonic is the smallest, most-used shape; major pentatonic is the same
shape from its relative root; blues is a one-note delta from minor
pentatonic; natural minor is the first 7-note extension; major is its
relative-minor pair). What changes is that **each row is now also a release
milestone**, not just a teaching-priority ranking:

- **Slice 1 ships the entire generic system** (Selector, all three
  exercises, SRS, mastery, progress board, Today-card integration, gating) —
  built once, for the one scale type. Every later slice is close to **pure
  data**: a new `ScaleTypeDef` row plus, if warranted, new
  `ScalePositionDef` rows. This is only possible because of the generative
  shape design in §4.3 below — there is no per-type hand-authored fret chart
  to write, so adding scale type *N+1* is cheap and low-risk by design, which
  is exactly what makes a gradual, session-by-session rollout practical
  rather than something that reopens the whole engine each time.
- "Mixed mastery of everything" (§6.2's final curriculum group) only starts
  to mean anything once at least two types have shipped, and only becomes the
  full picture once all five (or more, §8.5) exist — the curriculum/progress
  board code is written once, against the full catalogue, but naturally
  shows only what has shipped so far (an empty catalogue slot is simply not
  drilled, the same way a Future scale type is simply absent today).
- Modes beyond these five (Dorian, Mixolydian, Lydian, Phrygian, Locrian,
  harmonic/melodic minor) remain a catalogued **Future Extension** (§8.5),
  picked up after the five-row catalogue above is fully mapped, per this
  decision.

Note that **Natural Minor from A** and **Major from C** are the textbook
W–H / W–W–H formulas — the table deliberately keeps that recognisable
worked example intact (letters, not solfège) as the anchor case §1.4's
content points to, while the pentatonic/blues rows show the learner that the
same "fixed formula, moving root" idea holds even when the steps include a
step-and-a-half, not just whole/half.

### 4.3 Scale positions and item identity — generated, not hand-authored

**Revised from the original draft.** A scale "position" (a movable neck
shape, e.g. guitarists' conventional "box 1" / "box 2") was originally going
to be hand-authored as a fret-by-fret chart per scale type — mirroring, on
the surface, how a real fingering chart looks. Working through even one
example by hand (minor pentatonic box 1) showed this is exactly the kind of
data entry that is easy to get subtly wrong (one fret off on one string is
invisible in a spec but breaks the drill). It also has to be redone per
instrument (guitar, bass, ukulele, …), each with different tuning intervals.

**Better: a position is a *window*, and the actual fret positions are
computed**, using the same technique `targetPositionsForInterval`
(`intervals.ts`) already uses for Intervals — walk the fretboard's note
table and keep whatever matches. Nothing is hand-typed per shape, so there
is nothing to get wrong, and the same definition works for every instrument
without per-instrument authoring:

```ts
export interface ScalePositionDef {
  scaleTypeId: string;
  positionIndex: number;   // 1-based; which occurrence of the root, low to high
  /** Which string this position's root sits on — this, not a fret chart, is
   *  what makes "position 1" different from "position 2": the root simply
   *  moves to the next string down (or up) the instrument. */
  rootString: number;
  /** Fret window around the root fret, inclusive, e.g. { from: -1, to: 3 }.
   *  Every fret in [rootFret+from, rootFret+to], on every string, whose note
   *  matches one of the scale's pitch classes is part of the shape — this
   *  is the generative replacement for a hand-authored chart, and it is
   *  exactly how a "box" is conventionally taught (a handful of frets around
   *  a root, on every string). */
  window: { from: number; to: number };
}

/** Every neck position inside `position`'s window, at the given root fret,
 *  whose note is one of `scale`'s pitch classes above `rootFret`'s note.
 *  `noteTable` is the active `[string-1][fret] -> name` table
 *  (`InstrumentConfig.notes`), exactly as `targetPositionsForInterval` takes
 *  it. Returns `null` if the window would leave the fretboard, so the
 *  question generator tries a different root. */
export function shapeAtRoot(
  scale: ScaleTypeDef,
  position: ScalePositionDef,
  rootFret: number,
  noteTable: readonly (readonly string[])[],
): NeckPos[] | null {
  const rootName = noteTable[position.rootString - 1]?.[rootFret];
  if (!rootName) return null;
  const lo = rootFret + position.window.from;
  const hi = rootFret + position.window.to;
  if (lo < 0) return null;
  const scaleTones = new Set(
    [0, ...scale.degrees].map((s) => noteNameAtSemitones(rootName, s)),
  );
  const out: NeckPos[] = [];
  for (let s = 1; s <= noteTable.length; s++) {
    const row = noteTable[s - 1];
    for (let f = lo; f <= hi && f < (row?.length ?? 0); f++) {
      if (scaleTones.has(row[f])) out.push({ string: s, fret: f });
    }
  }
  return out;
}
```

For the MVP's two positions per shipped scale type: **position 1** roots on
the lowest string the instrument has (window roughly `{ from: -1, to: 3 }`,
matching the conventional "box 1" span); **position 2** roots on the next
string up (same window shape). Both are the *same* `ScalePositionDef` idea
applied to a different `rootString` — no per-type, per-position hand tuning.

**Item id** (`src/learning/scaleItem.ts`, mirrors `intervalItem.ts` exactly):

```ts
export const SCALE_ID_PREFIX = 'scale:';
export function scaleItemId(scaleTypeId: string, positionIndex: number): string {
  return `${SCALE_ID_PREFIX}${scaleTypeId}:${positionIndex}`;
}
```

Item count is now a per-slice number, not a single MVP total: **2 items per
shipped scale type** (its 2 positions). Slice 1 (minor pentatonic) ships 2
items; the full 5-row catalogue eventually reaches 10 — still the same order
of magnitude as Intervals' 11, for the same reason (a learnable, visible
curriculum and a small SRS), just arrived at incrementally.

### 4.4 Root selection per question

The root is **not** part of the item (§3). Each question picks a concrete
root string/fret the way Intervals picks a first note: difficulty-biased
(naturals first, any note at `full`), constrained so `shapeAtRoot` returns
non-`null` (the window fits the fretboard) — the same window-clamping
`targetPositionsForInterval` already does for Intervals, reused as-is.

---

## 5. Scale Selector specification

New `ScalePracticeScreen` (mirrors `IntervalPracticeScreen`: `app
settings-page lp-page` shell + hero + `<ProGate feature="scaleDrill"
variant="replace">`), body is a `useScaleSelector(instrument, isPremium)`
hook mirroring `useIntervalSelector` field-for-field: each control persisted
to its own `localStorage` key (`ssel_*` prefix), a derived settings object, a
`buildDrill()` producing a `DrillConfig` carrying a `scale` spec (§19).

### 5.1 Exercise (required)

Three options (detail in §8):

- **Build the scale** (`exercise: 'buildScale'`) — the app names a scale +
  root and marks the root on the neck; the learner taps every other note of
  the shape on `FretGrid`. Reuses the existing multi-find flow.
- **Identify the scale** (`exercise: 'identifyScale'`) — the app plays the
  scale ascending, root to top only (OD-S1, §17); the learner picks the scale
  name from a chip row.
- **Name the degree** (`exercise: 'nameDegree'`) — the app shows a scale +
  root + a degree number (e.g. "the 3rd of C major pentatonic"); the learner
  picks the target note from a note-chip row.

### 5.2 Scale selection (required)

Mirrors Intervals §5.2 exactly: **One scale** (single `(type, position)`
chip) / **A group** (curriculum group, §6.2) / **All learned** (default) /
**All 5 types** (every authored position, regardless of curriculum
progress).

### 5.3 Position

A second-level control, only shown once more than one position exists for the
selected scale type(s): **This position** / **All positions** for the current
selection. No "direction" axis exists for scales (a scale run is always
played root-up, OD-S1, §17).

### 5.4 Difficulty

`ScaleDifficulty = 'focused' | 'mixed' | 'full'`, same placement and shape as
`IntervalDifficulty` (§9). Clamped to `focused` when "One scale" is picked,
mirroring the Intervals clamp rule exactly.

### 5.5 Auto Advance — not in the MVP

Same as Intervals §5.5: no toggle, no scale stage sequence. Free Selector
practice plus the optional Today card / Teacher session (§13).

### 5.6 "?" summary bubble

Matched to the chosen exercise, same slot as Intervals §5.6, e.g.: *"You'll
see a root marked on the neck. Tap every note of the minor pentatonic shape
around it."*

### 5.7 Layout / reuse

Identical reuse list to `intervals-learning-spec.md` §5.7: `SettingCard` /
segmented-control / chip-row styles from `14-selector.css` /
`06-controls.css`; Start/countdown/`SpeedBar`/feedback unchanged;
`FretGrid` (Exercise A), a scale-name chip row (Exercise B, new small
component), a note-chip row (Exercise C, reused from Intervals).

---

## 6. Curriculum — an internal ordering, not a screen

Same non-negotiable framing as `intervals-learning-spec.md` §6: **not**
rendered as a path, no checkpoints, no unlock thresholds. Exists only so the
Teacher (§13) knows what to introduce next.

**This ordering is now also the literal build order (§4.2).** Originally this
section only meant "the order the Teacher introduces already-shipped scale
types in" — Notes and Intervals both ship their whole catalogue at once, so
that distinction never mattered there. Scales ships incrementally (one scale
type per session, per the product owner's decision), so §6.1's ranking below
doubles as the release plan: whichever scale type is not built yet simply
does not exist in the curriculum, the Selector, or the progress board yet —
there is no partial/disabled state to design for, the same way a Future
scale type (§8.5) is simply absent today.

### 6.1 Ordering rationale

1. **Minor pentatonic, box 1.** The smallest shape, the most immediately
   usable, and the one most learners already have some ear-familiarity with.
2. **Major pentatonic, box 1.** Same shape, learner discovers the relative-
   major relationship (two names, one shape, root moved).
3. **Blues scale, box 1.** One-note delta from a shape just learned — high
   payoff, low new load, and reinforces "a scale is a formula, not a fixed
   picture."
4. **Natural minor, box 1 (the 7-note extension).** Introduces the fuller
   diatonic shape once the pentatonic anchors are solid.
5. **Major (Ionian), box 1.** Relative-minor pair with the above, same
   pattern as pentatonic → its relative.
6. **Box 2 for each type** (pentatonic/blues first, then the diatonic pair).
   Reinforces that the *shape* moves and repeats up the neck.
7. **Mixed mastery.** Everything interleaved.

### 6.2 Curriculum groups (`src/learning/scaleCurriculum.ts`, mirrors
`intervalCurriculum.ts` data shape exactly — `IntervalGroup` → `ScaleGroup`,
`introduces: string[]` of item ids, `review`, and **confuser pairs**
(shapes that are easy to mix up, e.g. minor pentatonic box 1 vs. blues box 1,
which differ by exactly one note): same `currentGroupIndex` /
`sizesThroughGroup`-shaped API, renamed to operate on item ids instead of
semitone sizes.

---

## 7. Learning units — per-scale content

Mirrors `intervals-learning-spec.md` §7 exactly, in `scaleContent.ts`, with
one addition §1.4 makes mandatory: **the step formula and a letter-spelled
worked example come first**, before the degree-label shorthand, because that
formula is the one idea this whole domain must land. Per scale type:

- **Step formula**, in W/H notation, from `stepPattern()` — never re-authored
  by hand (§4.1's derivation guarantee).
- **Worked example**, root → root, in **letter note names** (from §4.2's
  table) — e.g. natural minor: *"W–H–W–W–H–W–W. From A: A, B, C, D, E, F, G,
  (A)."* This is the sentence every scale's content leads with.
- Degree formula in plain shorthand ("1, b3, 4, 5, b7") — the existing
  interval-degree framing, kept as a secondary, more compact restatement of
  the same formula for a learner who already has it.
- A one-line description, a "🔊 hear it" ascending playback, the
  nearest-neighbour confuser + discriminator (e.g. "the blues scale is the
  minor pentatonic plus one note — the b5, between the 4 and 5"), and a brief
  musical-role line ("the go-to rock/blues soloing scale").
- Wherever the formula's whole/half steps are named, the copy cross-links the
  Intervals vocabulary once per scale ("a whole step here is the same Major
  2nd Intervals Learning drills") — reinforcing §1.4's sibling-domain framing
  rather than teaching the same idea twice under different names.

No standalone theory screen; surfaced inline in the "?" bubble, post-answer
feedback, and the progress board rows (§1.4 lists exactly which surfaces).

---

## 8. Practice types

### 8.1 Exercise A — Build the scale

- **Stimulus:** the app marks the **root** on `FretGrid` (or names it, e.g.
  "root: A, string 5") and states the scale name.
- **Answer:** the learner taps every other note of the shape. Directly reuses
  the existing byNote multi-fret mechanic (`remainingFrets`/`foundFrets` in
  `useGameEngine.ts`) — the engine is handed an explicit `candidates` list
  (the shape's positions at the chosen root, from `shapeAtRoot`) exactly the
  way a Game stage or Teacher session already hands it position candidates
  today. **No new engine capability required for this exercise** — the
  biggest single reuse win in this design.
- **Correct:** all shape positions found before timeout (existing logic,
  unchanged).
- **Engine work:** none beyond a `scale` spec on `DrillConfig` that
  `deriveDrillConfig`'s scale-analogue computes `candidates` from per
  question (mirrors how the `interval` spec sits beside `candidates` without
  touching it).

### 8.2 Exercise B — Identify the scale

- **Stimulus:** the app plays the scale's notes in sequence, root to top,
  via `audio.ts` — a direct extension of the two-note sequential playback
  already built for Intervals Exercise A to N notes (N = 5, 6, or 7 depending
  on scale type).
- **Answer:** the learner picks the scale name from a **chip row** (5 scale
  names, or fewer with the group/one-scale pool).
- **Correct:** chosen chip's `scaleTypeId` matches.
- **Replay:** "🔊 hear it again," no penalty — same convention as Intervals.
- **Engine work:** small — generalise the Intervals two-note player to an
  N-note player; the interval-chip answer surface (§2 mapping table) is
  reused verbatim with a different label set.

### 8.3 Exercise C — Name the degree

- **Stimulus:** the app shows a scale name + root + a degree number/label
  (e.g. "5th degree of A minor pentatonic").
- **Answer:** the learner picks the target note from a note-chip row.
- **Correct:** enharmonic match of the picked note to
  `noteNameAtSemitones(root, ScaleTypeDef.degrees[n])`, via the existing
  `notesMatch`.
- **Engine work:** none beyond wiring — this is Intervals Exercise B with the
  interval size looked up from the scale's degree table instead of chosen
  directly. `buildTargetNoteOptions` is reused as-is.

### 8.4 Sufficiency

The three cover: recognising a shape by touch (A), recognising it by ear (B),
and understanding it as a formula of degrees rather than a fixed picture (C,
which also reinforces the Intervals connection). Proposed sufficient for a
first release, mirroring how Intervals shipped with exactly two.

### 8.5 Future Extensions (documented, not proposed for the MVP)

| Extension | What it adds | New dependencies |
|---|---|---|
| **Additional modes** (Dorian, Mixolydian, Lydian, Phrygian, Locrian, harmonic/melodic minor) | Wider scale-type table | More `ScaleTypeDef` rows; curriculum groups extend |
| **Full 5-box system per scale type** | All conventional positions, not just 1–2 | More `ScalePositionDef` rows; larger item count |
| **Connect-the-boxes** | A drill that spans two adjacent positions as one shape | New multi-position candidate geometry |
| **Auto Advance + scale stage sequence** | Guided walk through the curriculum groups automatically | `scaleStageSequence.ts`; a Selector toggle |
| **Scale-over-chord application** | "Which scale fits this chord?" | Chord content (premium-product-plan.md P6) |
| **Fingering / technique guidance** | Recommended fingering overlay | Out of scope for a note-recognition-first app |

---

## 9. Scale Difficulty model

Mirrors `intervals-learning-spec.md` §9 structurally.

### 9.1 Dimensions

| Dimension | Easier → Harder | In MVP? |
|---|---|---|
| Pool size | one scale/position → a group → all learned → all 5 types | **Yes** |
| Confuser presence | far-apart scale names as options → nearest confuser forced in (Exercise B) | **Yes** (mixed/full) |
| Number of answer options | 2–3 → 4 → 5 | **Yes** |
| Root bias | naturals-biased root → any root incl. accidentals | **Yes** |
| Position spread | box 1 only → any authored position | **Yes** |
| Per-question time | generous → tight | **Yes**, same ramp mechanism |
| Number of positions drilled per session | one position → all positions of the pool | **Future** (interleaving, mirrors Intervals §9.4) |

### 9.2 The three tiers (proposed envelope, tune in playtest)

| tier | pool | positions | answer options | root bias |
|---|---|---|---|---|
| focused | 1 scale | 1 | 2–3 | naturals |
| mixed | current group | 1 (per question, within the pool) | 4 | any |
| full | all learned / all 5 | any authored | 5 | any |

Base `questionCount`/`timeLimit` proposed the same order as Intervals (§9.3
there): `focused` more generous, `full` tighter — exact numbers deferred to
playtest, same as Intervals left them.

---

## 10. Scale SRS and weakness

### 10.1 Reuse

`src/learning/srs.ts` used **unchanged**, exactly as Intervals does. New
`InstrumentLearningState.scaleSrs: SrsMap`, id = `scale:<type>:<position>`.
Do not modify `srs.ts`; if scale-specific tuning is wanted, pass per-domain
constants the way §19 requires for Intervals.

### 10.2 Definitions

Identical shape to `intervals-learning-spec.md` §10.2: SRS item = one
`(scaleType, position)` pair; enters the schedule on first answer; correct →
bucket up, wrong/timeout → bucket reset to 0 + short lapse delay.

### 10.3 `scaleWeakness.ts`

Mirrors `intervalWeakness.ts` mirroring `weakness.ts`: over scale-tagged
history rows + `scaleSrs` — low recent accuracy, slow answers, repeated
misses, overdue SRS. A capped, synced `scaleHistory` (proposed ~200 rows per
instrument) in the learning-state blob, same as Intervals' `intervalHistory`
(OD-6 precedent).

---

## 11. Scale Mastery

Mirrors `intervals-learning-spec.md` §11 exactly: a `(scaleType, position)`
is **mastered** when its `scaleSrs` bucket ≥ a threshold (proposed 3, same as
Intervals) **or** recent accuracy ≥ 0.85 over ≥ 4 attempts. Own constants in
`scaleMastery.ts` (not imported from `intervalMastery.ts`, same
non-cross-contamination rule §19 states for Intervals vs. Notes).

"Scales mastered" surfaced as a count (`n/~12`) plus the flat board (§12). No
completion tier, no checkpoint, no star.

---

## 12. Scale progress — a flat board, grouped by scale type

Same non-negotiable as Intervals §12: **no Scale Learning Path**, no
checkpoint screen, no stage ladder. Proposed presentation: a flat board
grouped by the 5 scale types (each a small section header), each section
listing its authored positions as *not started / learning / mastered* rows —
this is the one presentational difference from the Intervals board (which is
a single flat list of 11), because "grouped by scale type" is how a guitarist
actually thinks about the material and the item count (§4.3) is designed to
stay small enough that this is still a single screen, not a drill-down.

---

## 13. Daily / Teacher for scales

Mirrors `intervals-learning-spec.md` §13 structurally: a "Today" card that
pulls overdue `scaleSrs` items first, then weak items from
`scaleWeakness.ts`, then the current curriculum group's not-yet-mastered
items, into a `mixed`-tier session; a "why these?" list (Due for review /
Often confused / New / Needs reinforcement) reusing the `.teacher-card` shell
and why-list pattern. Runs through the same `useLearning()` hook, additively
(`scaleTrackedCount`, `recordScaleAnswer`, `buildScalePlan`).

---

## 14. Daily goal

Own `scaleDaily` goal in the blob, separate from both the note daily goal and
`intervalDaily` — reviewing a scale never ticks either of the other two
goals, mirroring Intervals OD-5.

---

## 15. Persistence / cloud

`learningState.ts` gains, per instrument, alongside the existing `srs` /
`intervalSrs` / `daily` / `intervalDaily` / `intervalHistory` / `path`:
`scaleSrs: SrsMap`, `scaleDaily: DailyGoal`, `scaleHistory: HistoryRow[]`
(capped). Same normaliser / per-item merge treatment as the interval fields;
`learningSync.ts` carries the new keys through the existing pull → merge →
write-back → upsert cycle, no new sync module (exactly how `intervalSrs`
rode along inside the existing `user_learning_state` row without a new
migration table — a new column-less addition to the same JSONB blob needs no
new Supabase migration, only a doc-only note in the migration list the way
`0014` is annotated for intervals).

---

## 16. Gating

New feature key `scaleDrill` in `src/utils/features.ts`, `MIN_TIER:
'premium'`, added to the `Feature` union and `MIN_TIER` map next to
`intervalDrill`. `<ProGate feature="scaleDrill" variant="replace">` wraps
`ScalePracticeScreen`, mirroring `IntervalPracticeScreen` line for line.

---

## 17. Open Decisions — resolved

Mirroring `intervals-learning-spec.md` §24, the four questions this
document previously left open are resolved here so implementation has
nothing left to improvise. Each is a real product call, decided the way the
Intervals precedent decided its own OD list — in favour of the smaller,
sooner-shippable option, with the larger option catalogued rather than
dropped.

**OD-S1 — Exercise B playback is root-to-top only, not a full up/down run.**
A full run is more idiomatic but doubles Exercise B's per-question playback
time, and Intervals shipped its own listening exercise (two notes) at the
minimal footprint rather than the maximal one. A "play it both ways" toggle
is catalogued in §8.5.

**OD-S2 — the root is always pre-marked in Exercise A ("Build the scale").**
Exercise A stays squarely about the *shape*; asking the learner to also
locate the root note tests note-finding, which is Notes Learning's job, not
this domain's. This also keeps Exercise A a pure reuse of the existing
byNote/`FretGrid` flow (§2 mapping table) with zero new finding logic.

**OD-S3 — box naming shows both: the plain description leads, the
conventional number trails in parentheses.** e.g. *"Minor Pentatonic — near
the open position (Position 1)"* / *"Minor Pentatonic — around the 5th fret
(Position 2)"*. This matches how this app already prefers a plain-language
label with the technical term as a secondary cue (the same pattern the
Hebrew-facing copy in this repo uses: describe the control in plain words,
name the on-screen label parenthetically) rather than assuming the learner
already knows guitar-pedagogy box numbering.

**OD-S4 — exactly two positions per scale type, shipped one type at a time
(§4.2).** Now that positions are generated, not hand-authored (§4.3), the
reason to cap this is no longer authoring effort — it is keeping the SRS
schedule and the progress board (§12) small and legible while each new scale
type is still landing on its own. Two positions per type, ten items at the
full five-type catalogue, is the same order of magnitude as Intervals' 11,
for that reason. Position 1 roots on the instrument's lowest string; Position
2 on the next string up. The remaining conventional boxes (3, 4, 5) are §8.5
Future work, added later by extending `SCALE_POSITIONS` — trivial once
generation replaces authoring, since a new position is one `rootString`/
`window` row, not a new fret chart.

---

## 18. Architecture — target file layout (proposed, mirrors §20 for Intervals)

**All of this is built once, in the Slice 1 session (Minor Pentatonic, §4.2)
— every later scale type only touches `scales.ts` (a new `ScaleTypeDef` row)
and `scaleContent.ts` (its authored copy), never the files below it.**

```
src/utils/scales.ts                  # ScaleTypeDef, ScalePositionDef, shapeAtRoot — pure, imports intervals.ts
src/learning/scaleItem.ts            # scale:<type>:<position> id
src/learning/scaleCurriculum.ts      # ScaleGroup[], currentGroupIndex, sizesThroughGroup-equivalent
src/learning/scaleContent.ts         # per-scale-type authored copy (i18n keys)
src/learning/scaleDrill.ts           # builds DrillConfig with a `scale` spec; scaleDifficulty tiers
src/learning/scaleMastery.ts         # own thresholds; scaleStatus(); masteredItems()
src/learning/scaleWeakness.ts        # analyzeScaleWeakness over scaleHistory + scaleSrs
src/hooks/useScaleSelector.ts        # mirrors useIntervalSelector
src/components/ScaleCard.tsx         # entry card
src/components/ScalePracticeScreen.tsx
src/components/ScalePrompt.tsx
src/components/ScaleProgressBoard.tsx # the flat, grouped board (§12)
```

`useGameEngine.ts` gains a scale branch analogous to the interval branch:
`GameSettings.scale?`, a `buildScaleQuestion` that computes `candidates` for
Exercise A / plays the N-note sequence for Exercise B / looks up the target
note for Exercise C, and a `tagScale(entry)` helper stamping
`HistoryEntry.scaleItemId` — structurally identical to `tagInterval`.
`learningState.ts` / `learningSync.ts` gain the three new blob fields (§15).
`LearnHub.tsx`'s `LearnDomain` gains `'scales'`. `translations.ts` gains scale
name/degree/content keys, with Hebrew entries (per this repo's i18n
convention — every new user-facing string needs one).

---

## 19. What must not change

Same list `intervals-learning-spec.md` §19 gives for Intervals, restated for
Scales: `srs.ts` is not modified; `mastery.ts` (the Notes overlay) is not
touched; Notes' `buildDailyPlan` and `intervalDrill.ts`/`intervalCurriculum.ts`
etc. are not touched — Scales adds new files and new optional fields, it does
not edit the interval or note domains' logic. `useDrillHistorySink` isolation
must be proven the same way `wasIntervalRunRef` is proven for Intervals
(§2.1 mapping row): a scale run must never write to note history, mastery,
badges, leaderboard, or personal-best.
