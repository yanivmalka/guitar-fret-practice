# Intervals Learning — Implementation Specification

Status: **specification only. No code is changed by this document.** It is the
plan a developer implements from, phase by phase, without having to make
product decisions of their own. Every product decision it raised has been
resolved by the product owner — see §24. What remains open is only playtest
tuning of threshold/timer numbers.

Reference documents:
- `premium-product-plan.md` §4, §5, §8, §9 P4 — the shared-engine vision and the
  "intervals is the second domain" roadmap slot.
- `notes-system-map.md` — the full pedagogical + technical map of the Notes
  learning domain this spec parallels.
- `product-wishlist.md` "Interval drill (P4)" — the first vertical slice that is
  already shipped and the follow-ups deferred from it.

---

## 0. Foundational principle — total separation from Game

The app has **two independent systems**:

1. **Learning** — the adaptive teacher: Selector → practice → feedback → spaced
   review → visible progression. This is what this spec extends.
2. **Game** — a separate, gamified system (`src/game/**`: points, combo,
   achievements, stars, Worlds, Stages) aimed at learners who bounce off plain
   practice.

**This spec concerns Learning only.** No points, no combo multiplier, no
achievements, no stars, no Worlds/Stages, no XP enter the Intervals Learning
design. Game may, in a future unrelated effort, *consume* interval exercises;
that is out of scope here and must not shape any decision below.

**No stars, and no stage ladder, in Intervals Learning.** Stars belong to Game
only. And unlike the Notes Learning Path, Intervals has **no checkpoint / stage
screen** (product-owner decision — "no stages"). Interval progress is a **flat
status view of the 11 intervals** — each shown as *not started / learning /
mastered* — mirroring how the Notes mastery / statistics views present the
fretboard. There is no unlock ladder, no per-stage % bar, no completion tiers.
The curriculum (§6) is an **internal ordering the Teacher consults** to decide
what to introduce next; it is never rendered as a path the learner walks.
(The existing **Notes** Learning Path and its stars are shipped code, out of
scope, and not touched; this spec adds no stars to Notes.)

---

## 1. Product definition

### 1.1 What Intervals Learning is

An independent learning domain, structurally parallel to Notes Learning, that
teaches the learner to **understand intervals as the relationship between two
notes**.

By working through it the learner should be able to:

- know what an interval is and name the 11 drilled qualities (m2…M7);
- know each interval's size in semitones;
- **recognise an interval by ear** — hear two notes played in sequence and name
  the interval between them (Exercise A, §8.1);
- **apply interval knowledge to reach a target note** — given a first note and
  an interval, name the note that lies that distance above it (Exercise B,
  §8.1);
- tell **similar intervals apart** (M3 vs m3, P4 vs TT vs P5, M6 vs m6, m7 vs
  M7, M2 vs m2);
- begin to associate an interval with **its sound**;
- have a **basic** sense of each interval's musical role/character.

Locating an interval on the guitar neck (finding the target fret, learning the
fretboard shape) is **not** an MVP goal — it is a Future Extension (§8.5). The
MVP is entirely *listen / read → pick an answer from options*, the same
interaction shape as Notes Learning.

### 1.2 What it is not

- Not a theory course. No dense theory screens, no notation lessons, no
  key-signature spelling. Educational content is short, inline, and optional.
- Not a re-imagined UX. It reuses the Notes surfaces, vocabulary and rhythm
  (choose → practise → feedback → review → progress) wherever they fit.
- Not a Game mode. No stars, points, combos, XP, or achievements.
- **Not a stage ladder.** No Learning-Path screen, no checkpoints, no
  locked/unlocked stages, no per-stage progress bars or completion tiers. Progress
  is a flat status board of the 11 intervals (§12).
- Not (in the MVP): a neck-position exercise of any kind ("find the target fret"
  / "find a note on the neck given an interval"), Auto Advance / a fixed stage
  sequence, harmonic (simultaneous) intervals, cross-string shape drilling,
  "identify the interval between two given dots", or any listening exercise
  beyond the single Exercise A in §8.1. All of these are catalogued as **Future
  Extensions** (§8.5).
- **Ascending and descending are both in the MVP** — one feature, not
  "ascending now, descending later" (product-owner decision, OD-10).

### 1.3 Relationship to Notes Learning

Intervals is a **sibling** of Notes, not a layer on top of it and not a fork of
it. It has its own item identity, its own SRS map, its own weakness analysis,
its own (internal) curriculum ordering, its own daily planner, its own flat
progress view, its own translation keys. It **shares** the drill runner, the
Leitner SRS engine, the persistence blob + cloud sync mechanism, the
scoring/feedback/haptics infra, the full-page and card UI shells, and the
entitlement gate. It does **not** mirror the Notes Learning Path — there is no
interval path (§12).

Gate: the existing `intervalDrill` feature key (`src/utils/features.ts`,
`MIN_TIER.intervalDrill = 'premium'`). Everything in this spec is Premium-gated
through that one key unless a sub-feature is explicitly given its own key
(§16.4).

---

## 2. Current-state audit

**No code was changed during this audit.** Line references are snapshots.

### 2.1 Notes Learning — the parallel to mirror

| Concern | File(s) | Notes |
|---|---|---|
| Entry point | `src/components/LearnHub.tsx` (`LearnDomain = 'notes' \| 'daily' \| 'intervals'`), `src/App.tsx` `activeDomain` state (not persisted, resets to `'notes'`) | Drawer → "Learn" tile grid → domain. |
| Selector (raw picks) | `src/components/SelectorPanel.tsx`, `src/hooks/useSelector.ts` | Strings/multi, byNote/byFret, fret halves or precise Pro window, `Difficulty = 'dots'\|'naturals'\|'full'`, Auto Advance, order, notation. Persists each field to its own `localStorage` key. Produces `DerivedSettings` + `historyKey()`. |
| Derived note data | `src/hooks/useDerivedNotes.ts` | `DerivedSettings` → concrete note/fret render data. Note-oriented. |
| Drill runner / engine | `src/hooks/useGameEngine.ts`, `src/hooks/useDrillSession.ts`, `src/drill/DrillConfig.ts` (`deriveDrillConfig`, `drillConfigToGameSettings`, `computeSessionResult`, `SessionResult`) | The single session state machine. `DrillConfig.candidates` and `DrillConfig.interval` are the content seams. |
| Countdown / SpeedBar timing | `useGameEngine` countdown, `src/hooks/useScoring.ts` (`beginRun` timing ramp), `src/components/SpeedBar.tsx` | Per-question time ramps across a run. |
| Answer surfaces | `src/components/NoteCircle.tsx` (byFret answer), `src/components/FretGrid.tsx` (byNote answer, multi-fret `remainingFrets`/`foundFrets`) | Reused verbatim by the interval branch already. |
| Feedback / haptics / sound | `src/utils/feedback.ts` (`playClickSound`, `haptic`), `src/utils/audio.ts` | `click()` wrapper convention in `App.tsx`. |
| Auto Advance curriculum | `src/utils/stageSequence.ts` (`buildStageSequence`, ~86 steps) | Note-oriented (half-neck → strings → difficulty × mode → string pairs → whole neck). |
| Mastery overlay (pre-Premium) | `src/utils/mastery.ts` (`MasteryLevel = unplayed\|needsWork\|known`, 0.7), `src/learning/weakness.ts` for teacher weakness | Two different notions; `weakness.ts` states it does not replace `mastery.ts`. |
| SRS | `src/learning/srs.ts` — Leitner, `BUCKET_INTERVALS_MS = [0,20m,2h,1d,3d,7d,14d]`, `LAPSE_DELAY_MS = 3m`, `MAX_BUCKET = 6`. **Fully domain-agnostic** (id string is opaque). | Already runs `intervalSrs` unchanged. |
| Weakness | `src/learning/weakness.ts` — `analyzeWeakness` over `(string,fret)` history rows: low recent accuracy / slow / recent misses / overdue. `leastPractisedPositions` fallback. | **Note-only. No interval equivalent exists.** |
| Planner (Teacher) | `src/learning/planner.ts` — `buildDailyPlan` / `buildWeakSpotsPlan`: priority overdue → weak → path → consolidation → coverage; emits a `DrillConfig` with explicit `candidates`; `mode:'byFret'` only. | **Note-only.** `intervalDrill.ts` is the (much thinner) analogue. |
| Learning Path | `src/learning/path.ts` (`PATH_CHECKPOINTS` — 6 note-region checkpoints, `CheckpointRegion` = strings+fret window+`'naturals'\|'all'`), `src/learning/pathProgress.ts` (`evaluatePath`, `PathView`, `isMastered`: SRS bucket ≥ 3 **or** recent acc ≥ 0.85 with ≥ 3 attempts in a 12-answer / 45-day window; `foldCheckpointStars` monotonic; `mergePathProgress`). | **Note-only. No interval checkpoints.** |
| Teacher React wiring | `src/hooks/useLearning.ts` — owns per-instrument learning state, exposes `todayPlan`, `weakSpotsPlan`, `pathView`, `recordAnswer`, `recordPracticeAnswer`, and the P4 interval additions (`intervalTrackedCount`, `recordIntervalAnswer`, `buildIntervalPlan`). | Inert for non-Premium. |
| Persisted model | `src/learning/learningState.ts` — `localStorage['learningState']` = `{ version, instruments: { <id>: { srs, intervalSrs, daily, path, lastAnswerAt, updatedAt } } }`. Normalisers coerce untrusted input; per-key / per-item merge functions. | `intervalSrs` present since P4 (migration `0014`, doc-only). No `intervalDaily` / `intervalHistory` yet. |
| Cloud sync | `src/learning/learningSync.ts` — one JSONB row `public.user_learning_state.data`; **pull → merge → write-back → upsert**, per-item merge, never last-writer-wins; `learning-synced` window event. | Already carries `intervalSrs`. |
| Today / Daily / Path screens | `src/components/TodayCard.tsx`, `src/components/DailyPracticeScreen.tsx`, `src/components/LearningPathScreen.tsx` | Full-page shell `app settings-page lp-page` + hero + `<ProGate variant="replace">`; `teacher-card` card style; why-list pattern. |
| Stats | `src/components/ProgressPanel.tsx`, `src/stats-redesign/**`, mastery overlay | Per-`historyKey`, pre-Premium. |
| Adaptive difficulty banner | `src/components/AdjustSuggestionBanner.tsx`, `src/App.tsx` ~L1123 | Suggests step up/down by recent accuracy in a combo. Note-only. |
| i18n | `src/i18n/translations.ts` (flat English-key → Hebrew map), `src/i18n/useTranslation.ts` | Interval keys already present ~L657, ~L704–720 (names, card copy, "above"). |
| Manual check scripts | `scripts/check-learning.mts`, `check-learning-path.mts`, `check-intervals.mts` — run by hand: `node --experimental-strip-types scripts/check-*.mts`. No test runner in repo. | |

### 2.2 Intervals — what already exists (P4 first slice)

> **Important:** the P4 slice is built around two answer *forms* —
> `onNeck` ("find the target fret") and `byName` ("name the target note") — and
> is **ascending-only**. The practice model in **§8 replaces this framing**: the
> MVP has no neck-position exercise, adds a listening exercise the P4 slice does
> not have, and drills **both directions** (OD-10). **P4 code is not deleted or
> rewritten in this planning pass.** The rows below record what exists; the
> "Reusable?" column is read through the §8 model.

| File / symbol | What it does | Reusable under the §8 model? |
|---|---|---|
| `src/utils/intervals.ts` | `INTERVALS` table (11 rows, semitones 1–11, `short`, `nameKey`); `ALL_INTERVAL_SEMITONES`; `intervalBySemitones`; `noteNameAtSemitones(root, semitones)` (sharp-spelled, octave-equiv, flat-tolerant); `positionMidi`, `semitonesBetween`; `targetPositionsForInterval(refPos, semitones, noteTable, window)`; types `IntervalDef`, `IntervalForm = 'onNeck'\|'byName'`, `IntervalDrillSpec = { semitones:number[], direction:'up', form }`. | **Yes — the interval theory core.** `noteNameAtSemitones` is exactly what Exercise B needs. `targetPositionsForInterval` / `positionMidi` are used only to pick concrete notes to *sound*, not for a neck exercise. `IntervalForm` / the `form` field will need to change to an `exercise` field (`identifyInterval` / `findTargetNote`) — a later task, §8, §19. |
| `src/learning/intervalItem.ts` | `INTERVAL_ID_PREFIX = 'interval:'`; `intervalItemId(semitones)`; `isIntervalItemId`; `parseIntervalItemId` (accepts 1–11). Quality-only, ascending. Mirrors `noteItem.ts`. | **Yes — the item identity, unchanged.** Both §8 exercises drill these same 11 items. §4 confirms it. |
| `src/learning/intervalDrill.ts` | `buildIntervalDrill(opts) → DrillConfig` with an `interval` spec: overdue interval qualities listed first, all 11 always in the pool, fixed window `0..min(12,maxFret)`, fixed `questionCount = 12`, `timeLimit = 7`, all strings, `mode` from `form`. | **Partly.** The envelope-building shape is reused; the `form`→`mode` mapping and the "all 11 always" pool are replaced by the §8 exercise + §5 selection + §9 difficulty. |
| `useGameEngine.ts` interval branch | `GameSettings.interval?`; `IntervalPromptState`; `buildIntervalQuestion(qString, validFrets)` — picks a reference fret with room for an ascending target on the same string, computes target note/fret, emits the prompt; `tagInterval(entry)` stamps `HistoryEntry.intervalItemId`; `onNeck` sounds the **reference** note and hides the target fret; `byName` asks on the `NoteCircle`. Single same-string ascending target accepted. | **Partly.** `tagInterval` (SRS routing) and the reference-note-picking logic are reusable. **Exercise B** (`findTargetNote`) is close to the existing `byName` path (name the target note) — the main reuse. **Exercise A** (`identifyInterval`) is **new**: play two notes in sequence, accept an *interval* answer from a chip row — a new engine capability, not present in P4. **`onNeck` is dropped from the Learning model** (code stays; unused by Intervals Learning). |
| `src/components/IntervalCard.tsx` | Premium entry card (`.teacher-card .interval-card`): form toggle (`onNeck` / `byName`), "Start interval practice", `trackedCount` line. | **Card shell yes; the toggle changes** from `onNeck`/`byName` to the two §8 exercises. Superseded/absorbed by the Selector (§5). |
| `src/components/IntervalPracticeScreen.tsx` | Full-page shell hosting `IntervalCard` behind `<ProGate feature="intervalDrill" variant="replace">`; drawer "Intervals" tab target. | **Yes — the page shell.** Its body grows into the Interval Selector. |
| `src/components/IntervalPrompt.tsx` | Renders the on-screen question ("Major 6th above" / "Perfect 5th above G"). | **Yes for Exercise B** ("M3 above G"). **Exercise A** needs new copy ("Which interval did you hear?") + a replay control. |
| `learningState.ts` interval bits | `InstrumentLearningState.intervalSrs: SrsMap`; `recordIntervalAnswer(st, itemId, correct, now)` folds into `intervalSrs` only (never note `srs`, never daily goal, never path); normalised; merged per id (`mergeInstrumentState`). | **Yes.** Add `intervalDaily` + `intervalHistory` alongside, same pattern. No `intervalPath`. |
| `useLearning.ts` interval bits | `intervalTrackedCount`, `recordIntervalAnswer`, `buildIntervalPlan(form)`. | **Yes**, extend. |
| `App.tsx` interval wiring | `intervalPlan` state + ref; `intervalSink` (isolated in-memory history via `useDrillHistorySink`) so interval answers never touch note stats/mastery/badges/leaderboard; `wasIntervalRunRef` skips personal-best / badge sweep / leaderboard upsert at game-end; routes `activeDomain === 'intervals'` to `IntervalPracticeScreen`. | **Yes — the isolation is already correct.** |
| `translations.ts` | Interval name keys + card copy + "above". | Extend (§17). |
| `scripts/check-intervals.mts` | Manual checks for the interval math / id / drill / SRS-isolation. | Extend per new module. |

### 2.3 Known gaps in the P4 slice (from `product-wishlist.md`)

1. No Learning-Path checkpoints for intervals.
2. `buildDailyPlan` does not fold interval items in — an interval session is
   only launched from the card.
3. No adaptive difficulty for intervals (fixed window/count/timer).
4. P4 is ascending-only.
5. The P4 slice is built on `onNeck` / `byName` answer forms; the §8 model
   replaces these (no neck exercise; a new listening exercise).
6. No listening/ear exercise exists yet (P4 only sounds a reference note as a
   cue).
7. No interval weakness analyzer.
8. No interval Selector — only a 2-button card.
9. No interval Stats surface (only `intervalTrackedCount`).

This spec closes all nine (4 → both directions, OD-10). The only P4 limitation
left as **Future** is per-root / per-string-set SRS granularity (§4.2, OD-1).

---

## 3. Notes → Intervals mapping

Decision codes: **REUSE** (same code, unchanged) · **SHARED** (extract/confirm a
domain-agnostic seam, both domains call it) · **NEW-I** (new Intervals-specific
implementation, structurally mirroring the Notes one) · **N/A** (no interval
analogue needed) · **FUTURE** (analogue deferred, catalogued).

| Notes | Intervals | Decision | Detail |
|---|---|---|---|
| Note Item = `(string,fret)` (`noteItem.ts`) | Interval Item = interval quality (`intervalItem.ts`) | **NEW-I (exists)** | `interval:<semitones>`, 11 items, direction-agnostic. §4. Per-root/per-string-set = **Future** (OD-1). |
| Selector (`SelectorPanel` + `useSelector`) | Interval Selector (`IntervalSelectorPanel` + `useIntervalSelector`) | **NEW-I** | Same layout language, interval-appropriate controls only. §5. |
| The interaction shape: *system shows/plays info → user picks an answer from options* | Same shape, both interval exercises | **SHARED (concept)** | This is the through-line. Notes shows a fret / a note name; Intervals plays two notes / shows a note + interval. In both, the answer is a selection. |
| Note by Fret (`mode:'byFret'` → pick the note on `NoteCircle`) | **Exercise B — Find the target note**: first note + interval shown → pick the target note from options | **REUSE (partial)** | Closest to the P4 `byName` path ("M3 above G" → pick note). Reuses `noteNameAtSemitones`, `notesMatch`, and a note-pick surface (`NoteCircle` or a note-chip row — OD-11). |
| Fret by Note (`mode:'byNote'` → tap frets on `FretGrid`) | *(no analogue)* | **FUTURE** | Intervals has **no neck-position exercise** in the MVP. "Find the interval / target on the neck" is a Future Extension (§8.5). |
| *(no Notes analogue)* | **Exercise A — Identify the interval**: two notes played in sequence → pick the interval from options | **NEW-I** | New engine capability (sequential two-note playback + an interval-chip answer surface). §8.1. |
| `NoteCircle` | Answer surface for **Exercise B** (or a plain note-chip row) | **REUSE** | Unchanged if used. |
| `FretGrid` | *(not used by Intervals Learning MVP)* | **N/A (MVP)** | No neck exercise. Stays available for the Future neck extension. |
| *(new)* interval-chip row | Answer surface for **Exercise A** | **NEW-I (small)** | The same 11-chip component built for the Selector's "One interval" picker (§5.2), reused as an answer surface. |
| `useDerivedNotes` | thin interval render data | **NEW-I (small)** / mostly **N/A** | Per-question the engine derives the two concrete notes to play (Exercise A) or the target note name (Exercise B) from a root + semitones. A thin `useDerivedIntervals` only needs the active-quality list for the Selector preview. |
| `Difficulty` (dots/naturals/full) | `IntervalDifficulty` (focused/mixed/full) | **NEW-I** | Different axis; no neck-span dimension. §9. |
| Auto Advance + `stageSequence.ts` | Interval Auto Advance + interval stage sequence | **FUTURE** | Not in the MVP (OD-3 — "maybe later"). Interval practice is free Selector practice; the only guidance is the Teacher/Today card. §5.5, §13.6. |
| Ascending only | Ascending **and descending**, same feature | **NEW-I** | Both in the MVP (OD-10). Direction is a Selector control + a difficulty dimension; **not** a separate SRS item (§4, §5.3, §9). |
| Mastery (`mastery.ts` overlay: not started / learning / mastered) | Interval mastery — **same three states, per quality** | **NEW-I** | Per-quality predicate (§11), rendered as the flat 11-interval board (§12). A fretboard **shape** overlay = **FUTURE**. |
| Weakness (`analyzeWeakness`) | `analyzeIntervalWeakness` | **NEW-I** | Over interval-tagged history rows + `intervalSrs`. §10, §14. |
| SRS (`srs.ts`) | Interval SRS (`intervalSrs` map) | **SHARED** | `srs.ts` unchanged; interval map is separate. §11. |
| Planner (`buildDailyPlan`) | `buildIntervalDailyPlan` / `buildIntervalWeakSpotsPlan` | **NEW-I** | In `intervalDrill.ts` (or new `intervalPlanner.ts`). §14. |
| Teacher "Today" card (`TodayCard`) | Interval "Today" card | **NEW-I (mirrors)** | Reuses `.teacher-card`, why-list. §13, §16. |
| Learning Path (`path.ts` + `pathProgress.ts` + `LearningPathScreen`, 0–3★, checkpoints) | *(no analogue)* | **N/A** | Intervals has **no path / checkpoint screen** (product-owner decision — "no stages"). Progress is the flat 11-interval board (§12). The curriculum (§6) is a Teacher-internal ordering, not a rendered path. |
| `PATH_CHECKPOINTS` (ordered neck-region stages) | `INTERVAL_CURRICULUM` (ordered interval groups) | **NEW-I (data only)** | Used **only** by the planner to decide introduction order + which confusers to pair. No unlock thresholds, no per-stage progress. §6. |
| Daily goal (`DailyGoal` in blob) | Interval daily goal | **NEW-I** | Separate `intervalDaily` (OD-5). §14. |
| "Why these?" reasons | Interval "Why these?" reasons | **NEW-I (mirrors)** | Due for review / Often missed / New / Needs reinforcement. §13.3. |
| Neck mastery overlay | Interval shape overlay | **FUTURE** | Genuinely new visualization. Not MVP. |
| Stats & Progress (`ProgressPanel` + mastery overlay) | Interval progress section — the flat 11-interval board + numeric breakdown | **NEW-I (small)** | §12 + §15. |
| `historyKey()` scoping | interval history scoping | **N/A** | Intervals have no `historyKey`. Interval answers never touch note history; they feed `intervalSrs` and a **capped, synced `intervalHistory`** in the learning blob (OD-6, §15.2). |
| `AdjustSuggestionBanner` | interval adjust banner | **FUTURE** | Nice-to-have; not MVP. |
| Full-page shell (`settings-page lp-page` + hero + `ProGate`) | same | **REUSE** | `IntervalPracticeScreen` already uses it. |
| `ProGate` / `can('intervalDrill')` | same | **REUSE** | |
| `click()` = `playClickSound()` + `haptic.tap()` | same | **REUSE** | Convention. |
| Countdown / `SpeedBar` / `useScoring` timing ramp | same | **REUSE** | Engine-level, content-agnostic. |
| Personal best / badges / leaderboard | — | **N/A (excluded)** | `wasIntervalRunRef` already suppresses all three for interval runs. Keep. |

---

## 4. Interval Item model

### 4.1 Confirmed model (MVP)

- **An Interval Item is one interval quality.** Id:
  `intervalItemId(semitones)` = `"interval:<n>"`, `n ∈ 1..11`. (Already
  implemented, `src/learning/intervalItem.ts`.)
- **Direction is not part of the item.** An M3 drilled ascending and an M3
  drilled descending review the **same** `interval:4` (OD-10 — "ascending and
  descending are one feature"). Direction is a property of the *question*
  (`dir: 'up' | 'down'` on the history row), used for Stats and for the §9
  difficulty model, never a second SRS key. `noteNameAtSemitones` in
  `intervals.ts` is already sign-safe (it uses `mod 12`), so a descending
  question is `noteNameAtSemitones(first, -semitones)`.
- The 11 items, in semitone order (this is the *id* order, **not** the teaching
  order — see §7):

  | n | short | name key | semitones |
  |---|---|---|---|
  | 1 | m2 | Minor 2nd | 1 |
  | 2 | M2 | Major 2nd | 2 |
  | 3 | m3 | Minor 3rd | 3 |
  | 4 | M3 | Major 3rd | 4 |
  | 5 | P4 | Perfect 4th | 5 |
  | 6 | TT | Tritone | 6 |
  | 7 | P5 | Perfect 5th | 7 |
  | 8 | m6 | Minor 6th | 8 |
  | 9 | M6 | Major 6th | 9 |
  | 10 | m7 | Minor 7th | 10 |
  | 11 | M7 | Major 7th | 11 |

- Unison (0) and octave (12) are **not** drilled items. The octave may appear
  in educational copy as a reference frame; it is not an SRS item in the MVP.
- SRS, weakness, mastery, path progress and the planner all key on this id and
  nothing else derives its own id (mirrors the `noteItem.ts` rule).
- **Both MVP exercises (§8), in both directions, drill the same 11 items.**
  Exercise A, Exercise B, ascending, descending — all review the same
  `interval:<n>`. Exercise and direction are *forms of practice*, recorded on
  the history row (`form`, `dir`), not separate items. (Whether to eventually
  track them separately is §11.3, Future.)

### 4.2 Granularity — quality-only (decided, OD-1)

The MVP ships **quality-only**: 11 items, `interval:<n>`. 11 items is the right
size for a learnable, visible curriculum and a small SRS. Contextual difficulty
(which first note, which register, how many / which answer options, direction)
is expressed through the **question generator** driven by `IntervalDifficulty`
(§9), not through the item id.

Per-root (`interval:<n>@<pitchClass>`, up to 132 items) or per-string-set
granularity is a **Future** refinement — it can be layered on later by extending
`intervalItemId` without disturbing the existing per-item schedule.

---

## 5. Interval Selector specification

The Interval Selector replaces the body of `IntervalPracticeScreen` (the P4
`IntervalCard` becomes a subset of it). It must read as the same *kind* of
surface as `SelectorPanel`: a short help line, a small number of grouped
controls, a "?" summary bubble in plain language, then Play → Countdown →
practice. Every control below earns its place by changing what is drilled or how
hard it is; nothing is added for richness alone.

New hook `useIntervalSelector(instrument, isPremium)` mirrors `useSelector`:
each field persisted to its own `localStorage` key (`isel_*` prefix), a derived
settings object, and a `buildDrill()` that produces the `DrillConfig` (with an
`interval` spec) for a manual session.

### 5.1 Exercise (required)

A segmented control, exactly two options (full detail in §8.1):

- **Identify the interval** (`exercise: 'identifyInterval'`) — the app plays two
  notes in sequence; the learner picks the interval quality from a chip row of
  options. Tests recognising the relationship between two sounds.
- **Find the target note** (`exercise: 'findTargetNote'`) — the app shows a
  first note and an interval; the learner picks the note that lies that distance
  above it, from options. Tests applying interval knowledge to reach a note.

Both answer by **selecting from options**, matching the Notes interaction shape.

**From P4:** *Find the target note* is close to the existing `byName` path (name
the note an interval above a root) and reuses `noteNameAtSemitones`,
`notesMatch`, `tagInterval`, and a note-pick surface. *Identify the interval* is
**new** — sequential two-note playback + an interval-chip answer surface — and
is not present in the P4 slice. **The P4 `onNeck` form is not part of this
model**; its code is left in place (not deleted) and is unused by Intervals
Learning until a Future neck extension repurposes it.

**Also changed from P4:** the pool is the Selector's interval selection (§5.2),
not "always all 11"; count/timer/options come from `IntervalDifficulty` (§9),
not constants.

MVP ships exactly these two exercises. Any further listening exercise,
descending, harmonic intervals, "name the interval between two dots", and any
neck-position exercise are **Future Extensions** (§8.5).

### 5.2 Interval selection (required)

How the learner picks the practice material. A single control with these
levels (mirrors the Notes difficulty/string picker feel):

- **One interval** — pick a single quality from an 11-chip row (chips show
  `short`, e.g. `M3`). Drills that quality only; the question generator still
  varies the first note and the register.
- **A group** — pick one of the named curriculum groups (§6.2): *Perfect*,
  *Thirds*, *Steps*, *Sixths*, *Sevenths*, *Tritone*. Drills the group's
  qualities plus that group's designated confusers.
- **All learned** — every interval introduced so far (the union of the
  curriculum groups up to and including the current one, from
  `currentGroupIndex`). This is the default.
- **All 11** — the full set, regardless of curriculum progress. Available but
  not the default.

**"All learned" for a learner who has never used the Teacher** (decided, OD-2):
it means **all 11** — no artificial lock. There is no path to "engage"; once the
learner has practised enough that the Teacher has moved past group 1, "All
learned" is the introduced-so-far set.

**Teacher sessions ignore this control** — a guided session's interval set comes
from the planner (§13), exactly as Notes Teacher sessions ignore the Selector's
string/fret picks.

### 5.3 Direction (required — both in the MVP)

A segmented control: **Ascending / Descending / Both**, default **Both**
(OD-10 — ascending and descending are one feature, built together).

- `IntervalDrillSpec.direction` becomes `'up' | 'down' | 'both'` (replacing the
  P4 fixed `'up'`).
- **Ascending:** the second note is `first + semitones` (Exercise A plays low→
  high; Exercise B prompt reads "*M3 above G*").
- **Descending:** the second note is `first − semitones` (Exercise A plays high→
  low; Exercise B prompt reads "*M3 below G*"). Uses
  `noteNameAtSemitones(first, -semitones)` (already sign-safe).
- **Both:** each question picks a direction at random from the pool.
- Same `interval:<n>` SRS item either way (§4.1); the row records `dir`.
- **Guided sessions** (Path / Teacher) use **Both**, except a *focused*-tier
  session on a brand-new quality, which runs **Ascending** first (§9.2).

Engine work: `buildIntervalQuestion` must pick a first note with room for the
target **above or below** as the chosen direction requires; `IntervalPrompt`
gains "below" copy.

### 5.4 Difficulty

An `IntervalDifficulty` control — **focused / mixed / full** — see §9 for the
model. Same placement and interaction as the Notes difficulty segmented control.
When "One interval" is selected, difficulty is clamped to **focused** (a single
quality cannot be "mixed"); the control disables the other two, mirroring how
`useSelector` clamps difficulty to `full` under a precise window.

### 5.5 Auto Advance — not in the MVP

No `intervalAutoAdvance` toggle, no interval stage sequence (product-owner
decision, OD-3 — "maybe we'll add it later"). Interval practice is **free
Selector practice**, exactly like the core note-drilling loop: pick material →
Play → practise → pick again. The only guided progression in the MVP is the
Learning Path (§12) and the Teacher/Today card (§13), both optional and both
alongside the free Selector — never a forced sequence.

Auto Advance + an interval stage sequence are a **Future Extension** (§8.5).

### 5.6 "?" summary bubble

Plain-language one/two lines, same slot as `SelectorPanel`'s `selectionSummary`,
matched to the chosen exercise:

- *Identify the interval:* *"You'll hear two notes. Pick the interval between
  them. Practising: major & minor 3rds."*
- *Find the target note:* *"You'll see a note and an interval. Pick the note
  that far above it. Practising: major & minor 3rds."*

Plus a one-line "how to read this" note for the active answer surface (the
`NoteCircle` clock-face note when the note-pick surface is the circle).

### 5.7 Layout / reuse

- Page: existing `IntervalPracticeScreen` shell (`app settings-page lp-page` +
  hero `🎸` + `<ProGate feature="intervalDrill" variant="replace">`). Unchanged.
- Controls: reuse `SettingCard` / segmented-control / chip-row styles from
  `styles/14-selector.css` and `styles/06-controls.css`. No new design system.
- Start button + countdown + `SpeedBar` + feedback: reuse as-is.
- Answer surfaces: the interval-chip row (Exercise A) and the note-pick surface
  (Exercise B — `NoteCircle` or a note-chip row, OD-11). `FretGrid` is **not**
  used.
- The P4 `IntervalCard` is either folded into the Selector as its "start row" or
  kept as the compact default with the extra controls disclosed — **Open
  Decision (minor, UI)**; its start callback changes from `onStart(form)` to
  `onStart(exercise)`.

---

## 6. Curriculum — an internal ordering, not a screen

The curriculum is a **Teacher-internal ordering** of the 11 intervals into an
introduction sequence plus confuser pairings. It is **not** rendered as a path,
has **no** checkpoints, unlock thresholds, or per-stage progress. The learner
never "walks" it. It exists so the planner (§13) knows *what to introduce next*
and *which pairs to always drill together*. All 11 intervals are available in
the Selector at any time (§5.2).

### 6.1 Ordering rationale

Semitone order (m2 → M7) is **not** the teaching order. The order is by ease of
hearing, conceptual simplicity, closeness/discriminability between qualities,
and musical importance — in priority:

1. **Framework first.** The perfect 4th and 5th are strong, stable consonances,
   the easiest intervals to *hear* as a distinct sound, and the harmonic
   skeleton everything else hangs off (root–5th, the "power" sound). Taught as a
   contrasting pair.
2. **Colour next.** Major vs minor 3rd is the single most musically consequential
   distinction — it is what makes a chord major or minor. The pair teaches
   "one semitone changes the whole character", both by ear and by the
   name→note calculation.
3. **Steps.** Major and minor 2nds are conceptually the simplest (one / two
   semitones) and reinforce semitone counting, but m2 is a harsh sound to learn
   in isolation early — so steps come after the learner has consonant anchors to
   contrast against.
4. **Sixths.** Taught as "inverted thirds" — leans on the thirds the learner
   just consolidated; wide, warm intervals.
5. **Sevenths.** Chord-extension colour (dominant vs major 7). Wide, and easiest
   to confuse with the octave and the 6th — so they come once 6ths are solid.
6. **Tritone.** The most theoretically loaded and the most distinctive in sound
   (tense, unresolved); taught last of the singletons, explicitly against the P4
   and P5 it sits between.
7. **Mixed mastery.** All 11 interleaved.

Interval **similarity** (what gets confused with what) drives which confusers a
group's *mixed/full* pool includes (§9.2).

### 6.2 The curriculum groups

Seven groups, in introduction order. Each group names the qualities it
**introduces**, the earlier qualities it keeps for **review** (~20–30% of a
guided pool), and the **confuser pairs** the planner must always drill together
so the learner practises telling them apart.

| # | id | Introduces | Review | Confuser pairs |
|---|---|---|---|---|
| 1 | `perfect` | P4 (5), P5 (7) | — | P4↔P5 |
| 2 | `thirds` | m3 (3), M3 (4) | P4, P5 | M3↔m3; M3↔P4 |
| 3 | `steps` | m2 (1), M2 (2) | m3, M3 | m2↔M2; M2↔m3 |
| 4 | `sixths` | m6 (8), M6 (9) | m3, M3 | M6↔m6; m6↔P5 |
| 5 | `sevenths` | m7 (10), M7 (11) | m2, M2, M6 | m7↔M7; m7↔M6 |
| 6 | `tritone` | TT (6) | P4, P5 | TT↔P4; TT↔P5 |
| 7 | `all` | — (all 11 interleaved) | all 11 | every nearest-neighbour pair |

### 6.3 How the ordering is used

- **No hard locks.** Every interval is drillable from the Selector at any time
  (§5.2). The ordering does not gate content.
- **The Teacher introduces in this order.** The planner (§13) treats group *k*
  as "current" once the intervals of groups 1…*k−1* are mostly mastered (§11.1
  predicate over `intervalSrs` + `intervalHistory`), and pulls the current
  group's not-yet-mastered intervals into the daily plan. "Mostly mastered" is a
  simple ratio (e.g. ≥ 70% of the earlier intervals), computed on the fly — **not
  stored, not a checkpoint**.
- **Confuser pairs** are injected into guided pools whenever one member of a
  pair is present (§13.5), so "tell them apart" always happens.
- Group 7 (`all`) is just "the Teacher now interleaves everything".

### 6.4 Data shape

New module `src/learning/intervalCurriculum.ts` (data only — no progress, no
storage):

```
export interface IntervalGroup {
  id: string;                    // 'perfect', 'thirds', …
  order: number;                 // 1-based introduction order
  name: string;                  // English-as-i18n-key, e.g. 'Perfect 4th & 5th'
  introduces: number[];          // semitone sizes introduced here
  review: number[];              // earlier sizes kept for review
  confusers: [number, number][]; // pairs the guided pool must drill together
}
export const INTERVAL_CURRICULUM: readonly IntervalGroup[];

/** Sizes introduced through group index `idx` inclusive (the "learned so far" set). */
export function sizesThroughGroup(idx: number): number[];

/** The current group index: the first whose earlier groups are < `readyRatio`
 *  mastered. Pure — takes the mastered-size set, returns an index. No storage. */
export function currentGroupIndex(masteredSizes: Set<number>, readyRatio?: number): number;
```

There is **no** `unlockThreshold` / `completeThreshold` / `bestPct` / stored
checkpoint record. The only persisted interval progress is `intervalSrs` (+ the
capped `intervalHistory`); the current group is always derived.

---

## 7. Learning units — per-interval content

For each of the 11 qualities, the following is authored once (in
`src/learning/intervalContent.ts`, all user-facing strings as i18n keys) and
surfaced **inline** — never as a standalone theory screen.

Per quality:

- **Name** (`nameKey`, already in `INTERVALS`).
- **Short label** (`short`, already in `INTERVALS`).
- **Semitones** (already in `INTERVALS`).
- **One-line description** — what it is in plain words, including its size in
  semitones. e.g. m3: *"Three semitones — the 'minor' colour; a small,
  slightly sad-sounding gap."*
- **Sound example (primary)** — play the first note then the second note via
  `audio.ts` (already available), ascending, melodic (one then the other). This
  is central: Exercise A *is* recognising this sound. A "🔊 hear it" control
  sits on the prompt and in post-answer feedback.
- **Nearest-neighbour comparison** — the one or two intervals it is most
  confused with and the discriminator, phrased for the ear and for
  semitone counting. e.g. *"A tritone is one semitone wider than a P4 and one
  narrower than a P5 — it sounds tense and 'unresolved'."*
- **Musical role (brief)** — one sentence. e.g. M3: *"The bright third of a
  major chord."* m7: *"The interval that makes a dominant 7th chord want to
  resolve."* TT: *"The 'blue note' / the gap in a dominant chord."*
- **Neck shape hint (optional, secondary)** — a one-line "on a guitar this is
  roughly…" note (e.g. P5: *"same fret, next string toward you"*). It is
  reference colour for a guitarist, **not tied to any MVP exercise**; render it
  as a collapsible extra, never as the main feedback line. May be omitted for
  the first release.

Where this content appears:

- The **"?" summary** and a collapsible "about this interval" line in the
  Selector when "One interval" is chosen.
- The **post-answer feedback** for a missed question: name + semitones + the
  comparison discriminator + a 🔊 replay of the two notes. (The neck hint, if
  authored, is a further disclosure — not the headline.)
- A small **"about this interval"** disclosure on each row of the flat progress
  board (§12) and on the Interval Today card's "why these?" rows, analogous to
  `TodayCard`'s why-list.

No new full screen. The content module is data; the surfaces above already
exist or are thin additions.

---

## 8. Practice types

**Exactly two exercises in the MVP. Both are *stimulus → pick an answer from
options*, the same interaction shape as Notes Learning. There is no
neck-position exercise.**

### 8.1 Exercise A — Identify the interval

- **Stimulus:** the app plays two notes **in sequence** (first note, short gap,
  second note) via `audio.ts` — low→high for an ascending question, high→low for
  a descending one (§5.3). Example (ascending): G then B.
- **Answer:** the learner picks the interval from a **chip row of options**
  (interval `short` labels, e.g. `m3` `M3` `P4` `P5`). Example answer: `M3`.
- **Tests:** recognising the relationship between two sounds.
- **Correct:** the chosen chip's semitone value equals the interval that was
  played.
- **Replay:** a "🔊 hear it again" control re-plays the two notes (no penalty).
- **What is shown:** the two note **names are hidden** during the question — the
  point is the sound. They are revealed in post-answer feedback. *(Whether to
  offer an optional "show the notes" reveal is OD-12.)*
- **Concrete notes played:** the engine picks a first note and a register (the
  existing reference-picking logic + `positionMidi` / the sample map), then the
  second note `= first ± semitones` per the question's direction. Difficulty
  (§9) governs the first-note choice, the register, the direction, and how many
  / which chips are offered.
- **Engine work:** this is a **new capability** — sequential two-note playback
  and an interval-chip answer. Not in the P4 slice. Sits behind the `interval`
  spec (`exercise: 'identifyInterval'`), so note flows are untouched.

### 8.2 Exercise B — Find the target note

- **Stimulus:** the app shows a **first note** (text, e.g. *G*), an **interval**
  (text, e.g. *Major 3rd*), and a **direction** ("above" / "below"). It also
  sounds the first note (a single note, on question start) — OD-13.
- **Answer:** the learner picks the **target note** from a **note-chip row** of
  options (OD-11 — a plain chip row, not the `NoteCircle`). Example answer for
  "M3 above G": *B*.
- **Tests:** applying interval knowledge to reach a target note. (An interval +
  direction alone still needs a first note to define a pair, which is why a
  first note is always given.)
- **Correct:** enharmonic match of the chosen note to
  `noteNameAtSemitones(first, ±semitones)` (sign per direction), via
  `notesMatch` (already).
- **From P4:** this is the existing `byName` path ("Perfect 5th above G" → pick
  the note), extended with the "below" direction and a chip row instead of the
  circle. Drop the `onNeck` branch from the Learning model.

### 8.3 Both exercises

- One `intervalItemId` per question → `intervalSrs`, via the existing
  `tagInterval` → `intervalSink` → `recordIntervalAnswer` path. Exercise A must
  be wired into the same tagging (its new engine branch calls the same helper).
- Both directions (§5.3); the row records `dir: 'up' | 'down'` and
  `form: 'identify' | 'findNote'`. Same SRS item regardless.
- Wrong / timeout handling per §10.2.

### 8.4 Sufficiency

The two cover: what an interval is and its semitone size (both, reinforced by
the answer the learner reasons out), telling similar intervals apart (both, via
confuser options in mixed/full — §9), connecting an interval to its sound
(Exercise A, plus the 🔊 replay everywhere), and applying the knowledge to name a
second note (Exercise B). Sufficient for the first release.

### 8.5 Future Extensions (documented, not built)

| Extension | What it adds | New dependencies |
|---|---|---|
| **Auto Advance + interval stage sequence** | A toggle that walks the curriculum groups (focused → mixed → all-11) automatically after each session | `intervalStageSequence.ts`; a `Selector` toggle; OD-3 says "maybe later" |
| **Find on the neck** | Given first note + interval → tap the target fret; and/or a fretboard-shape trainer | a new neck answer surface (the T5-removed `onNeck` branch is in git history as a starting point); the neck math (`targetPositionsForInterval` etc.) is still in `intervals.ts`; multi-position acceptance; per-string-set granularity (§4.2) |
| Harmonic (simultaneous) Identify | Play both notes together, then name the interval | polyphonic sample mixing in `audio.ts` |
| Name-the-interval-between-two-dots | Two dots on the neck → pick the interval | neck answer surface; `semitonesBetween` (exists) |
| Sound → find the note | Play first note (audio) + interval → pick/sing/play the target | pitch playback or detection |
| Musical-application prompts | "Which interval is the root→3rd of a D major chord?" | triad content (plan P5) |

No additional listening exercise, harmonic exercise, neck exercise, or Auto
Advance enters the MVP without explicit product approval. (Descending **is** in
the MVP — OD-10.)

---

## 9. Interval Difficulty model

Answers "what makes an interval question harder?" MVP ships three named tiers
(`focused` / `mixed` / `full`), exposed as a **Selector control**. The guided
planner (§13) does **not** auto-select a tier — like the Notes Teacher it runs
one fixed envelope (`mixed`); the current curriculum group only decides *which
intervals* are in the pool, not the tier.

### 9.1 Dimensions

Only dimensions that make *these two exercises* harder — no neck/fretboard
dimension exists in the MVP.

| Dimension | Easier → Harder | In MVP? |
|---|---|---|
| Pool size | one quality → a group → all learned / all 11 | **Yes** (Selector interval selection + difficulty) |
| Confuser presence | answer options are far apart → options include the nearest confuser(s) | **Yes** (mixed/full) |
| Number of answer options | 3 options → 5 → 6+ | **Yes** (focused fewer, full more) |
| First-note difficulty | natural first notes (C, G, A…) → any incl. accidentals | **Yes** (focused = naturals-biased, full = any) |
| Register spread (Exercise A) | notes in a comfortable mid register, close together → wider register, extremes | **Yes** (focused narrow, full wide) |
| Direction | ascending only → both ascending and descending mixed | **Yes** (focused new-quality = ascending; mixed/full = both) |
| Per-question time | generous → tight | **Yes** (see §9.3) |
| Harmonic vs melodic (Exercise A) | melodic (sequential) → harmonic (together) | **Future** |
| Form tracking | one exercise → both forms interleaved in a session | **Future** (see §13.1) |

### 9.2 The three tiers

- **Focused** — 1–2 qualities (a single quality, or one curriculum group's
  *introduced* pair). Answer options are that pair plus 1–2 clearly distant
  qualities; **no near confuser**. First notes biased to naturals. Narrow
  register. **Ascending only** while a quality is brand-new (not yet mastered);
  descending folds in once it is mastered. Generous timer. The "learn the sound
  / the calculation" tier. Reached only from the Selector, or (later) by a
  planner refinement — the MVP planner never picks it.
- **Mixed** — the pool's qualities; any of the current curriculum group's
  declared **confuser pairs that are in the pool are completed** among the
  options. Any first note. **Both directions.** Medium register / timer. **This
  is the guided-session default** (§13.1) and the "tell them apart" tier.
- **Full** — all learned qualities (or all 11 if the Selector says so); every
  nearest-confuser present among the options; any first note; **both
  directions**; wide register; tight timer. The "fluent recognition" tier.
  Selector only.

The Selector's Direction control (§5.3) overrides the tier's direction default
when the learner sets Ascending / Descending / Both explicitly. A guided session
is always Both (it runs `mixed`).

**Where the "ascending for a brand-new quality" rule lives:** in the shared
`intervalDifficulty` function — when called with `focused` and a set of
not-yet-mastered sizes, it emits `direction: 'up'`. It is unit-tested directly
(call with `difficulty: 'focused'`), **not** exercised through the planner.

### 9.3 Concrete envelope values (tune in playtest)

| tier | questionCount | base timeLimit (s) | answer options | first-note bias |
|---|---|---|---|---|
| focused | 12 | 9 | 3 | naturals when possible |
| mixed | 15 | 8 | 4–5 | any |
| full | 18 | 7 | 5–6 | any |

The engine still needs an internal fret/register to *sound* notes and to pick a
first note; that is derived from `fretFrom`/`fretTo` on the `DrillConfig`
(kept 0–12 for the MVP) but it is **not a difficulty-facing control** and no
neck window appears in the Selector. Timer still rides
`useScoring.beginRun`'s continuous ramp across the run, unchanged.

### 9.4 MVP vs Future

- **MVP:** the three tiers above, driven by the Selector control and by guided
  contexts; the pool / confuser / option-count / first-note / register /
  direction / timer dimensions. **Both ascending and descending.**
- **Future:** harmonic Exercise A, interleaving both exercise forms in one
  session, an adaptive promote/demote banner (`AdjustSuggestionBanner`
  analogue), Auto Advance.

---

## 10. Interval SRS

### 10.1 Reuse

`src/learning/srs.ts` is used **unchanged**. The interval schedule is the
separate `InstrumentLearningState.intervalSrs: SrsMap`, already present. Buckets,
intervals (`BUCKET_INTERVALS_MS`), `LAPSE_DELAY_MS`, `MAX_BUCKET`, `dueItems`,
`mergeSrsMaps` all apply as-is; the id string (`interval:<n>`) is opaque to the
scheduler.

**Do not modify `srs.ts`.** If any tuning is wanted for intervals (e.g. shorter
first intervals because there are only 11 items), it must be done by passing a
per-domain interval table into a parametrised function — see §19 — and Notes
must keep the exact current constants.

### 10.2 Definitions

- **SRS item:** one interval quality (`interval:<n>`), per instrument.
- **Enters the schedule:** the first time that quality is answered in any
  interval session (`getOrCreate` in `recordIntervalAnswer`). Nothing pre-seeds
  all 11.
- **Correct:** `HistoryEntry.correct === true` for the tagged row — the learner
  picked the right option before timeout (the interval chip in Exercise A, the
  target note in Exercise B). → `reviewSrsItem(item, true, now)`:
  `bucket → min(bucket+1, 6)`, `dueAt = now + BUCKET_INTERVALS_MS[bucket]`,
  `reps++`.
- **Wrong:** `correct === false`. → `reviewSrsItem(item, false, now)`: `bucket →
  0`, `dueAt = now + LAPSE_DELAY_MS` (3 min), `lapses++`, `reps++`.
- **Timeout:** `correct === null`. Folded in as **wrong** — `recordIntervalAnswer`
  is called with `entry.correct === true` (i.e. `false`), matching how
  `recordTeacherAnswer` treats a note timeout.
- **Due:** `dueAt <= now`. `dueItems(intervalSrs, now)` ranks most-overdue
  first; ties break on the id string (deterministic; a `compareIntervalItemId`
  helper may be added for a numeric tie-break, but string order is acceptable
  for 11 items).

### 10.3 Integration with the practice types

- Both exercises emit exactly **one** tagged row per question, so each question
  is one SRS review of one `interval:<n>`.
- An abandoned / timed-out question still emits one `null` row → one lapse, the
  same for both exercises.
- The exercise form (`form: 'identify' | 'findNote'`) and the direction
  (`dir: 'up' | 'down'`) are recorded on the row for Stats and possible future
  per-form / per-direction tracking (§11.3), but **neither** changes which item
  is reviewed — an ascending and a descending M3 both review `interval:4`.

### 10.4 Integration with Daily / Teacher

The interval planner (§14) calls `dueItems(intervalSrs, now)` to put overdue
qualities first in a guided session's pool, and `analyzeIntervalWeakness`
(§10.5) for the weak ones. This is the **interval** planner only — the note
`buildDailyPlan` is not touched, and interval ids never enter the note `srs`
map.

**Decided (OD-5):** intervals have their **own** `intervalDaily` goal, separate
from the note daily goal. Interval reviews never tick the note goal. See §14.

### 10.5 `analyzeIntervalWeakness`

New function (in `src/learning/intervalWeakness.ts`, mirroring `weakness.ts`)
over interval-tagged history rows + `intervalSrs`:

- **Input:** the persisted `intervalHistory` rows (§15.2 — decided: kept in the
  blob and synced), `intervalSrs`, `now`, a config.
- **Signals per quality:** low recent accuracy, slow correct answers, repeated
  recent misses, overdue SRS — same four as `weakness.ts`.
- **Window:** because there are only 11 items and sessions are short, use a
  larger window (e.g. last 20 answers per quality) and a shorter recency
  horizon is unnecessary — keep 45 days.
- **Output:** ranked `IntervalWeaknessSignal[]` with the numbers behind each
  pick (for the "why these?" copy).

**Decided (OD-6):** persist a **small, capped** interval history (last ~200 rows
per instrument) in the learning-state blob (`intervalHistory`), stored and
synced **exactly like every other part of the learning state** — localStorage
first, best-effort cloud reconcile, per-item/append merge, never mixed into note
history / stats / mastery. `analyzeIntervalWeakness` and the interval Stats
section read it.

---

## 11. Interval Mastery

### 11.1 Definition (MVP — one simple, reliable model)

A quality is **mastered** when **either**:

- its `intervalSrs` bucket ≥ `INTERVAL_MASTERED_BUCKET` (start at **3**, same as
  notes), **or**
- its recent accuracy ≥ `INTERVAL_MASTERED_ACCURACY` (**0.85**) over ≥
  `INTERVAL_MASTERED_MIN_ATTEMPTS` (**4** — one more than notes, because there
  are fewer items and more chance to fluke) within the recent window.

A quality with no schedule row and little history is **not mastered** (implicit
"not started" / "learning" states, as in notes — not formal enum layers).

Constants and the predicate live in `src/learning/intervalMastery.ts` (a small
module — the mastery predicate, the three-state classifier
`intervalStatus(size) → 'notStarted' | 'learning' | 'mastered'`, and the
`masteredSizes(...)` set builder that the curriculum's `currentGroupIndex`
consumes). **Do not reuse the Notes constants by import** — copy the values so
tuning one domain never moves the other (§19).

### 11.2 Domain mastery

"Intervals mastered" = **all 11 qualities mastered**. Surfaced only as a count
(`n/11`) and the flat board (§12). No completion tier, no checkpoint, no star.

### 11.3 Future split

If later evidence shows the single predicate conflates distinct skills, split
into: **Knowledge** (name ↔ semitones), **Ear recognition** (Exercise A),
**Applied** (Exercise B — name the target note), and a future **Neck**
dimension. The `form` on each history row (§10.3) already carries the data
needed to do this later. Catalogued as a Future Extension — **not** built as a
multi-dimensional model in the MVP.

---

## 12. Interval progress — the flat 11-interval board

**There is no Interval Learning Path.** No checkpoint screen, no stage ladder,
no unlock progression, no per-stage bars, no stars. Progress is one **flat
board of the 11 intervals**, presented the way the Notes mastery / statistics
views present the fretboard.

### 12.1 The board

- One row (or tile) per interval, in curriculum order (§6.2), showing:
  - `short` + full name (e.g. `M3` — Major 3rd);
  - a **status**: *not started* / *learning* / *mastered* — from
    `intervalStatus(size)` (§11.1), the same three-level idea as
    `utils/mastery.ts`'s `unplayed / needsWork / known`;
  - a thin accuracy bar (recent accuracy for that interval), like the Notes
    mastery cells.
- A header line: **`n / 11 mastered`**, and "currently learning: <group name>"
  (the current curriculum group from `currentGroupIndex` — informational only,
  no lock).
- Lives inside the interval Stats surface (§15) — a section of `ProgressPanel`
  or a small `IntervalStatsPanel` on the Intervals page. **Not** a full-page
  "path" of its own.

### 12.2 Module

`src/learning/intervalMastery.ts` (from §11) provides everything the board
needs: `intervalStatus`, `masteredSizes`, and a `buildIntervalBoard(opts) →
IntervalBoardRow[]` that pairs each of the 11 sizes with its status + recent
accuracy from `intervalSrs` + `intervalHistory`. Pure; no storage of its own.

### 12.3 Persistence

**Nothing new.** The board is derived every render from `intervalSrs` (exists)
and `intervalHistory` (§15.2). There is **no** `intervalPath` field, no
checkpoint record, no `bestPct`. Migration `0015` covers only `intervalDaily`
and `intervalHistory`.

### 12.4 Practising from the board

Each row may carry a small "practise this" affordance that starts a *focused*
single-interval session (same as picking it in the Selector's "One interval").
Optional for the MVP; the Selector already covers it.

---

## 13. Daily / Teacher for intervals

### 13.1 The interval planner

New `buildIntervalDailyPlan` + `buildIntervalWeakSpotsPlan` (extend
`src/learning/intervalDrill.ts`, or split into `src/learning/intervalPlanner.ts`
if it grows past ~150 lines). Both emit a `DrillConfig` with an `interval` spec
and an explicit interval-quality pool, run through the existing
`useDrillSession`.

Priority order for the daily plan (mirrors `planner.ts`, interval-scoped):

1. **Overdue** — `dueItems(intervalSrs, now)` qualities, most overdue first.
2. **Weak** — `analyzeIntervalWeakness` qualities not already included.
3. **Current curriculum group** — the not-yet-mastered qualities of the current
   `INTERVAL_CURRICULUM` group (from `currentGroupIndex` over `masteredSizes`),
   capped so it never fully dominates a session. This is what "introduces new
   material in curriculum order" means — no checkpoint, just the next group.
4. **Consolidation** — qualities doing fine (bucket ≥ 2, not due) so a session
   is not all struggle.
5. **Coverage** — least-practised of the intervals learned so far, so a new
   learner always has a full session.

Session envelope: **always `mixed`** (§9.3) — so **both directions**, always —
exactly like the Notes Teacher runs one fixed envelope. Lightly adaptive ±1 s
by the chosen pool's recent accuracy (mirror `planner.ts`'s `clusterAcc`
nudge). The planner never drops to `focused` or jumps to `full`; a learner who
wants `focused` (ascending-only, easing into a new interval) uses the Selector.
**Exercise for a guided session** (decided, OD-7): one exercise for the whole
session, chosen on the Interval Today card, default *Find the target note*,
one-tap switch to *Identify the interval*. Interleaving both forms in a single
session is Future (§9.4).

### 13.2 The weak-spots plan

Overdue ∪ weak qualities only; `null` when nothing qualifies (Today card then
shows "no weak intervals yet").

### 13.3 "Why these?"

Structured rationale like `TeacherPlan.rationale`, rendered as an expandable
list on the Interval Today card (reuse the `teacher-why-*` classes). Reason
labels (new i18n keys):

- `due for review` (reuse existing key) — overdue in `intervalSrs`.
- `often missed` (reuse) — low recent accuracy.
- `new` — a not-yet-mastered interval from the current curriculum group.
- `needs reinforcement` (≈ existing `reinforcement`) — consolidation pick.
- `broadening` (≈ existing `not practised much`) — coverage pick.

### 13.4 Recycled from the Notes planner

- The overall priority skeleton (overdue → weak → new → consolidation →
  coverage) and the "always return a plan" fallback contract.
- The `clusterAcc` ±1 s adaptivity idea.
- The `rationale` → sentence pattern and the why-list UI.

### 13.5 Interval-specific

- Operates on 11 qualities, not hundreds of positions — `sessionSize` is
  effectively "how many distinct qualities", cap ~6.
- Pool → `interval.semitones` (preference-ordered), not `candidates` positions.
- Confuser injection: if the plan's qualities include one member of the current
  curriculum group's `confusers` pairs, ensure the *other* member is also in the
  pool.
- `analyzeIntervalWeakness` instead of `analyzeWeakness`.
- The "current group" is `INTERVAL_CURRICULUM[currentGroupIndex(masteredSizes)]`
  — computed on the fly, nothing stored.
- The plan always carries `difficulty: 'mixed'` and `direction: 'both'`. It
  never sets `focused` / `full` — those are Selector-only tiers (§9.2).

### 13.6 Interval stage sequence — Future only

Not in the MVP (OD-3). If Auto Advance is ever added,
`src/utils/intervalStageSequence.ts` would walk the curriculum groups
(focused → mixed) then a final `full` step on all 11. Listed only so the shape
is on record; **no task builds it**.

### 13.7 React wiring

Extend `useLearning`:

- `intervalTodayPlan` / `intervalWeakSpotsPlan` (from `intervalSrs` +
  `intervalHistory` + `INTERVAL_CURRICULUM`).
- `intervalBoard` (`buildIntervalBoard` — the flat 11-interval view for §12/§15).
- `intervalDailyGoal` (separate goal — §14).
- keep `recordIntervalAnswer`. **No checkpoint-progress fold effect** — there is
  no checkpoint record to fold.

`App.tsx`: the `IntervalPracticeScreen` body renders the Interval Selector +
(Premium) an Interval Today card + the flat 11-interval board (§12). **No
"View your Interval Learning Path" link** — there is no path screen.

---

## 14. Daily goal

### 14.1 Separate daily goal (decided — OD-5)

Intervals have their **own** `intervalDaily` record —
`{ dateISO, target, completed }` in the blob, its own progress bar on the
Interval Today card. Interval reviews never tick the note `DailyGoal`. Unifying
the two is out of scope (it needs the note-SRS + interval-SRS "consider together"
work the wishlist flags).

### 14.2 Roll-over / merge

Reuse `rollDailyGoal` / `mergeDailyGoal` / `isDailyGoalComplete` verbatim on the
`intervalDaily` record. Default `target`: **10** (shorter than notes' 12 — fewer
items, denser questions). Tune.

---

## 15. Stats & Progress

### 15.1 Metrics (all pedagogically meaningful)

On an "Intervals" section (in `ProgressPanel` or a small dedicated
`IntervalStatsPanel` on the Interval page):

- **The flat board (§12):** the 11 intervals, each *not started / learning /
  mastered* + a recent-accuracy bar. This is the primary progress surface.
- **In the system:** `11` (constant).
- **Started:** `Object.keys(intervalSrs).length` — qualities ever drilled.
- **Needs work:** count of `analyzeIntervalWeakness` signals (or bucket < 2 +
  recent lapse).
- **Mastered:** count where §11.1 predicate holds (`n/11`).
- **Accuracy:** correct / answered over the recent `intervalHistory` window,
  overall and per quality.
- **Response time:** mean seconds of correct answers, overall and per quality.
- **Currently learning:** the current curriculum group's name (informational —
  no lock, no %, no "n/7").
- **Per exercise / direction (optional):** accuracy split by `form` (Identify vs
  Find the note) and by `dir` (ascending vs descending).

### 15.2 Interval history persistence (decided — OD-6)

The P4 slice sends interval answers to an isolated **in-memory** sink
(`useDrillHistorySink` in `App.tsx`) that is lost on reload. The MVP adds
`InstrumentLearningState.intervalHistory: IntervalHistoryRow[]` — a capped ring
buffer (~200 rows/instrument) of
`{ semitones, dir, form, correct, seconds, createdAt }`. Fed by a wrapper around
the same sink. **Stored and synced exactly like the rest of the learning
state** — localStorage first, best-effort cloud reconcile in the same blob,
merged by concatenate-dedupe-then-cap-by-`createdAt`. Read only by
`analyzeIntervalWeakness` and the interval Stats section; **never** merged into
note history / stats / mastery / badges / leaderboard.

### 15.3 Excluded

No points, no XP, no streak count, no leaderboard, no badges for intervals
(the P4 `wasIntervalRunRef` suppression stays). No per-`historyKey` slicing
(intervals have no `historyKey`).

---

## 16. UI / UX reuse

**Goal: Intervals looks and feels like Notes. No new design system.**

### 16.1 Reuse directly (no change)

| Component / style | Used for |
|---|---|
| `IntervalPracticeScreen` full-page shell (`app settings-page lp-page`, hero, `ProGate variant="replace"`) | The Intervals page |
| `SpeedBar`, countdown, `useScoring` ramp | Timing UI |
| `IntervalPrompt` | On-screen question — Exercise B ("M3 above/below G"); Exercise A gets new copy + a replay control |
| `audio.ts` playback | Exercise A two-note playback; 🔊 replay everywhere |
| Feedback toast / correct-wrong styling, `playClickSound` + `haptic.tap` | Answer feedback |
| `.teacher-card` + `teacher-*` classes | Interval Today card, Selector "start" card |
| `teacher-why-*` classes | "Why these?" list |
| `utils/mastery.ts` cell styling / `ProgressPanel` mastery grid | The flat 11-interval board (§12) — same *not started / learning / mastered* visual language |
| *(not used)* `FretGrid`, `NoteCircle`, `LearningPathScreen`, `lp-cp-*` path styles | No neck exercise; no path screen; answers are chip rows (OD-11) |
| `SettingCard`, segmented controls, chip rows (`styles/06`, `styles/14`) | Selector controls (exercise, interval selection, difficulty, direction) |
| `ProGate` + `can('intervalDrill', tier)` | Gating |
| `Chevron`, back-button pattern | Page nav |

### 16.2 Adapt (structure reused, props/content differ)

| Component | Adaptation |
|---|---|
| `TodayCard` | New `IntervalTodayCard` (own file), same classes; interval pool instead of positions, interval reasons, an exercise toggle (Identify / Find the note). **No path link.** |
| `SelectorPanel` | New `IntervalSelectorPanel` (own file), same layout grammar, interval controls only (§5). |
| `IntervalPrompt` | Add the Exercise A form: "Which interval did you hear?" + a "🔊 hear it again" button; "below" for descending. |
| `ProgressPanel` / mastery grid | Add an "Intervals" section (or a sibling `IntervalStatsPanel`) hosting the flat 11-interval board (§12) + the §15.1 numbers. |
| `LearnHub` tile | Already exists (`🎸 Intervals`). No change beyond it now leading to a real Selector. |

`LearningPathScreen` is **not** adapted or forked — Intervals has no path screen.

### 16.3 New (small, no new design language)

- 11-chip interval row — the Selector's "One interval" picker **and** Exercise
  A's answer surface (reuse chip styles).
- Note-chip answer row for Exercise B (OD-11) — reuse the same chip styles.
- Direction segmented control (Ascending / Descending / Both) — same style as
  the exercise / difficulty segmented controls.
- The flat 11-interval board — reuse the Notes mastery-grid cell styling
  (*not started / learning / mastered* + a thin accuracy bar). No stars, no
  state pill, no lock icons.
- "🔊 hear it" / "hear it again" control on the prompt and feedback (reuse an
  icon button style).

### 16.4 Sub-feature gates

All under `intervalDrill`. If the Interval Teacher is ever to be gated
separately, add an `intervalTeacher` key to `features.ts` (`'premium'`); not
required for the MVP.

---

## 17. Persistence / cloud

### 17.1 Blob shape after this work

```
localStorage['learningState'] = {
  version: 1,
  instruments: {
    <instrumentId>: {
      srs: SrsMap,               // notes — UNTOUCHED
      intervalSrs: SrsMap,       // exists (P4)
      daily: DailyGoal,          // notes — UNTOUCHED
      intervalDaily: DailyGoal,  // NEW (separate goal — OD-5)
      path: PathProgress,        // notes — UNTOUCHED
      intervalHistory: IntervalHistoryRow[],  // NEW — capped ~200; { semitones,dir,form,correct,seconds,createdAt }
      lastAnswerAt: number,
      updatedAt: string,
      // NO intervalPath / checkpoint record — interval progress is derived
      // from intervalSrs + intervalHistory every render (§12).
    }
  }
}
```

### 17.2 Rules

- **Separation is absolute:** note SRS, interval SRS, note progress, interval
  progress are independent. No code path writes an interval id into `srs` or a
  note id into `intervalSrs` (the `interval:` prefix + `parseNoteItemId`
  returning `null` already enforce this; keep the invariant).
- **Two new fields only:** `intervalDaily` and `intervalHistory`. **No
  `intervalPath` / checkpoint record** — interval progress is derived, never
  stored.
- **Normalisation:** `intervalDaily` reuses `normalizeDaily`; `intervalHistory`
  gets a `normalizeIntervalHistory` (array of coerced rows, cap length).
  Absent ⇒ empty (pre-`0015` blobs).
- **Merge:** extend `mergeInstrumentState` — `intervalDaily` via
  `mergeDailyGoal`, `intervalHistory` via concat-dedupe-by-(`createdAt`,
  `semitones`, `form`, `dir`)-then-cap. Still **not** last-writer-wins.
- **Cloud:** `learningSync.ts` is generic over the blob (`normalizeLearningState`
  → `mergeLearningState` → upsert). Adding fields to `InstrumentLearningState`
  and its merge is sufficient; **no schema migration, no `learningSync.ts`
  logic change** beyond the merge functions it calls. Document as `0015`
  doc-only.
- **Sign-out:** `clearLocalLearningState` already drops the whole blob — new
  fields are covered.

---

## 18. i18n

All new user-facing strings via `t()` / `translations.ts`. No hard-coded
strings. Groups to add:

1. **Interval names** — full names already present (`Minor 2nd` … `Major 7th`).
   Add short labels if shown as words anywhere, and `Octave`, `Unison` for
   comparison copy.
2. **Interval descriptions & musical roles** — one description + one role line
   per quality (§7). ~22 keys.
3. **Comparison lines** — nearest-neighbour discriminators (§7). ~11–14 keys.
4. **Neck-shape hints (optional)** — one per quality, only if authored (§7).
5. **Selector labels** — exercise names ("Identify the interval", "Find the
   target note"), "One interval", "A group", "All learned", "All 11",
   "Practising:", difficulty tier names ("Focused" / "Mixed" / "Full"), group
   names ("Perfect", "Thirds", "Steps", "Sixths", "Sevenths", "Tritone"),
   direction ("Ascending" / "Descending" / "Both"), the two "?" summary
   templates.
6. **Practice prompts** — Exercise A: "Which interval did you hear?", "Hear it
   again"; Exercise B: "above" (exists) + "below", "%s above %s is %s" /
   "%s below %s is %s" feedback, "⏱ …".
7. **Curriculum group names** — 7: "Perfect 4th & 5th", "Major & minor 3rds",
   "Whole & half steps", "Major & minor 6ths", "Major & minor 7ths",
   "The tritone", "All intervals". Shown only as "currently learning: …".
   **No checkpoint titles/blurbs, no state-pill labels, no star strings.**
8. **Progress / Stats & the board** — "not started" / "learning" / "mastered"
   (three states), "In the system", "Started", "Needs work", "Accuracy",
   "Avg. time", "currently learning", "%d of 11 mastered".
9. **Today card / Why these?** — "Today's intervals", "Recommended", reason
   labels ("new", "broadening", reuse the rest), "Start interval practice"
   (exists), "Practise my weak intervals", "No weak intervals yet — …".
10. **Feedback** — replay control label ("Hear it"), correct/wrong lines,
    the revealed note names for Exercise A.

Every key must be added to the Hebrew map in the same commit that introduces it
(the file is English-key → Hebrew-value; a missing key falls through to the
English literal, which must never ship for a new string).

---

## 19. What must not change — and how shared infra is touched safely

### 19.1 Do NOT modify

- **Notes Learning behaviour** — `useSelector`, `SelectorPanel`,
  `useDerivedNotes`, `stageSequence.ts`, the by-note/by-fret note flows in
  `useGameEngine` (except the already-present interval branch), `TodayCard`
  content, `DailyPracticeScreen`.
- **Notes SRS** — `srs.ts` constants and functions; the note `srs` map.
- **Notes Mastery** — `mastery.ts`, `weakness.ts`, `pathProgress.ts`
  `isMastered` thresholds.
- **Notes Learning Path** — `path.ts` `PATH_CHECKPOINTS`, `pathProgress.ts`,
  `recordCheckpointStars`, `LearningPathScreen` (and its `<Stars>`). Intervals
  has no path screen and does not touch any of this.
- **Game** — `src/game/**` curriculum (`worlds.ts`, `stages.ts`), scoring,
  achievements, progression, `gameProgress.ts`, `gameSync.ts`,
  `evaluateStars` / `StarRating` (intervals never call these).
- **Personal best / badges / leaderboard** for interval runs — the
  `wasIntervalRunRef` suppression in `App.tsx` stays.
- **No new stars** anywhere — not in Intervals Learning, not in Notes Learning.

### 19.2 Shared infra that IS touched — with the safety argument

| Shared file | Change | Notes code that uses it | How Notes stays identical |
|---|---|---|---|
| `src/learning/srs.ts` | **None.** (If interval-specific bucket tuning is later wanted: add an optional `intervals?: number[]` param to `reviewSrsItem`/callers, default = current `BUCKET_INTERVALS_MS`.) | note `srs` map, `planner.ts`, `pathProgress.ts` | Default param = today's constant; note callers pass nothing. Covered by `check-learning.mts`. |
| `src/learning/learningState.ts` | Add **`intervalDaily` + `intervalHistory`** fields (no `intervalPath`) + their normalise/merge; extend `mergeInstrumentState`, `normalizeInstrumentState`, `emptyInstrumentState`. | every note learning path | New fields are additive; existing fields' normalise/merge untouched; pre-`0015` blob → new fields default empty. `check-learning.mts` + `check-intervals.mts` assert note fields unchanged and a legacy blob round-trips. |
| `src/learning/learningSync.ts` | **None** (generic over the blob). | note sync | No logic change; merge is delegated to `mergeLearningState`. |
| `src/hooks/useLearning.ts` | Add interval-plan + `intervalBoard` derivations. **No checkpoint fold effect** (no stored interval progress). | note Teacher wiring | New `useMemo` blocks with their own deps; note blocks unedited. |
| `src/hooks/useGameEngine.ts` | **T5: replace the `form` switch with an `exercise` switch.** `identifyInterval` = new branch (two-note playback + a `selectInterval` answer entry); `findTargetNote` = the existing target-note logic answered via note chips + "below". **The unreachable `onNeck` branch is removed** — `tagInterval` and the reference/first-note picking are kept. | note by-note/by-fret | All interval logic stays behind `if (interval)` / `switch (interval.exercise)`. The note byFret/byNote branches are not edited. `check-intervals.mts` asserts a note-only run is byte-identical. |
| `src/drill/DrillConfig.ts` | `interval?` sub-type: `form` → `exercise`, `direction: 'up'\|'down'\|'both'`, optional `optionCount`. Interval-only sub-type. | Practice, Game seam | `deriveDrillConfig` (Notes) never sets `interval`; untouched. |
| `src/utils/intervals.ts` | **T5: full rename.** Delete `IntervalForm`; `IntervalDrillSpec.form` → `exercise`; `direction` gains `'down'`/`'both'`. The neck math (`noteNameAtSemitones`, `positionMidi`, `semitonesBetween`, `targetPositionsForInterval`) is untouched. | nothing in Notes | Type-level; every interval call site is migrated in the same task (T5 file list); `check-intervals.mts` updated. |
| P4 spillover files — `App.tsx`, `IntervalCard.tsx`, `IntervalPracticeScreen.tsx`, `useLearning.ts`, `intervalDrill.ts` | **T5 migrates all of them** to the `exercise` model (each is named in T5's file list with its exact change) — no half-migration, no lingering `form` field. | none touch Notes | `npm run build` must be green with no `form` / `onNeck` reference left. |
| `src/components/LearningPathScreen.tsx` | **None.** Intervals has no path screen — nothing forked, nothing mirrored. | note Path screen | Not edited at all — the Notes stars stay exactly as shipped. |
| `src/i18n/translations.ts` | Add keys only. | all | Additive. |
| `src/utils/features.ts` | No change (reuse `intervalDrill`), unless §16.4 keys are wanted. | gate map | Additive if changed. |
| `src/utils/music.ts` | Add optional `HistoryEntry.intervalForm?: 'identify'\|'findNote'` and `intervalDir?: 'up'\|'down'` (needed by §8.3 / §10.3). | note history rows | Optional fields, unset for note rows — exactly like the P4 `intervalItemId?` precedent. |
| `src/components/ProgressPanel.tsx` | Add optional interval props + an Intervals section that renders only when `intervalBoard`/`intervalStats` are present (T8 / §16.2 — "or a `ProgressPanel` section"). | Stats screen | Non-Premium / no data ⇒ nothing renders; the Notes sections are untouched. |
| `src/styles/22-teacher.css` | **Append** `.interval-*` / `.ivl-*` rules; change no existing rule (P4's `.interval-prompt-*` already lives here). | teacher-card styling | No new stylesheet (§16 / T11); additive only. |

Any shared change ships in its own task with its `check-*.mts` updated and a
manual pass confirming the Notes surfaces are visually and behaviourally
unchanged (§21).

---

## 20. Architecture — target file layout

```
src/
  utils/
    intervals.ts                 [EXISTS, small change]  form→exercise; direction gains down/both; +question helpers
  learning/
    srs.ts                       [SHARED, unchanged]   Leitner engine
    learningState.ts             [SHARED, +fields]     blob model + normalise + merge
    learningSync.ts              [SHARED, unchanged]   cloud reconcile

    noteItem.ts                  [NOTES]
    weakness.ts                  [NOTES]
    planner.ts                   [NOTES]
    path.ts / pathProgress.ts    [NOTES]

    intervalItem.ts              [EXISTS]  interval quality identity
    intervalContent.ts           [NEW]     per-quality descriptions / comparisons / roles (data, i18n keys)
    intervalCurriculum.ts        [NEW]     INTERVAL_CURRICULUM (7 groups, data only), sizesThroughGroup, currentGroupIndex — NO thresholds, NO progress
    intervalMastery.ts           [NEW]     intervalStatus / masteredSizes / buildIntervalBoard + mastered constants (own values)
    intervalWeakness.ts          [NEW]     analyzeIntervalWeakness
    intervalDrill.ts             [EXISTS, grow]  buildIntervalDrill + buildIntervalDailyPlan + buildIntervalWeakSpotsPlan
      (split to intervalPlanner.ts if it exceeds ~150 lines)
    intervalStageSequence.ts     [FUTURE only — no MVP task builds it]
  hooks/
    useSelector.ts               [NOTES, unchanged]
    useIntervalSelector.ts       [NEW]     mirrors useSelector; isel_* keys
    useLearning.ts               [SHARED, +interval derivations]
    useGameEngine.ts             [SHARED, +Exercise A branch]  new two-note-playback + interval-answer path behind if (interval)
    useDrillSession.ts           [SHARED, unchanged]
  components/
    IntervalPracticeScreen.tsx   [EXISTS, grow]  hosts the Selector + Today card + the flat board
    IntervalSelectorPanel.tsx    [NEW]
    IntervalChoiceRow.tsx        [NEW, small]  chip row — 11-interval variant (Selector picker + Exercise A answer); note variant (Exercise B answer)
    IntervalTodayCard.tsx        [NEW]     mirrors TodayCard, .teacher-card classes
    IntervalBoard.tsx            [NEW, small]  the flat 11-interval status board (reuses mastery-grid cell styling)
    IntervalPrompt.tsx           [EXISTS, grow]  + Exercise A copy + replay control
    IntervalCard.tsx             [EXISTS]  folded into the Selector's start row (or kept compact); onStart(exercise)
    LearningPathScreen.tsx       [NOTES, unchanged]  keeps its own stars — NOT reused
    IntervalStatsPanel.tsx       [NEW, small]  hosts IntervalBoard + numeric §15.1 breakdown; or a section inside ProgressPanel
scripts/
  check-intervals.mts            [EXISTS, extend]  covers curriculum data + mastery + planner + engine
```

Principle: **no Note/Scale/Chord/Interval *engines*** — one `useDrillSession`.
Shared = runner, SRS engine, blob+sync, scoring/feedback, page/card shells,
gate. Per-domain = item identity, question/prompt generation, weakness analyzer,
planner, curriculum content, difficulty model, educational content, the flat
progress board. Do not build a grand `Domain` abstraction to "unify" notes and
intervals in this pass — mirror the structure, share only what is already a
clean seam.

---

## 21. Implementation tasks

Each task: **Objective · Files · Changes · Does · Does NOT change ·
Dependencies · Acceptance · Verification.** The order below is the recommended
sequence; it broadly follows the requested order, with the reordering explained
at the end.

### T1 — Interval curriculum data model

- **Objective:** encode the §6 curriculum ordering as typed data.
- **Files:** `src/learning/intervalCurriculum.ts` (new);
  `src/learning/intervalContent.ts` (new); `src/i18n/translations.ts` (group
  names, content keys).
- **Changes:** `IntervalGroup` type (`introduces` / `review` / `confusers` —
  **no thresholds, no progress fields**); `INTERVAL_CURRICULUM` (7 groups);
  `sizesThroughGroup(idx)`; `currentGroupIndex(masteredSizes, readyRatio?)`;
  per-quality content records (description, comparison, role, optional neck
  hint) as i18n keys.
- **Does:** provide the single source of curriculum-ordering truth.
- **Does NOT change:** any runtime behaviour; `path.ts`; anything Notes. **No
  checkpoint / threshold / star data anywhere.**
- **Dependencies:** none.
- **Acceptance:** 7 groups, orders 1–7; `∪ introduces` across all = {1..11}, no
  dup; every `confusers` pair sits within that group's `introduces ∪ review ∪
  earlier introduces`; `currentGroupIndex(∅)` = 0; `currentGroupIndex(all 11)` =
  6.
- **Verification:** `check-intervals.mts` asserts the above; `npm run build` +
  `npm run lint`.

### T2 — Interval mastery + the flat board

- **Objective:** compute each interval's status and the 11-row board — no
  checkpoints, no path.
- **Files:** `src/learning/intervalMastery.ts` (new).
- **Changes:** `INTERVAL_MASTERED_*` constants (own values, not imported from
  notes); `isIntervalMastered(size, intervalSrs, historyRows, now)`;
  `intervalStatus(size, …) → 'notStarted' | 'learning' | 'mastered'`;
  `masteredSizes(intervalSrs, historyRows, now) → Set<number>`;
  `buildIntervalBoard(opts) → IntervalBoardRow[]` (11 rows: size, status, recent
  accuracy). All pure. **No `meetsGoal`, no `evaluateStars`, no stored record.**
- **Does:** pure evaluation; deterministic given inputs.
- **Does NOT change:** `pathProgress.ts`; note mastery; `game/*`.
- **Dependencies:** T1 (for the board's curriculum order).
- **Acceptance:** empty inputs → 11 rows all `notStarted`; a quality at bucket ≥
  3 → `mastered`; `masteredSizes` feeds `currentGroupIndex` correctly; grep
  confirms no `evaluateStars` / `StarRating` / `bestPct` / `★` / `checkpoint` in
  the module.
- **Verification:** extend `check-intervals.mts`; build + lint.

### T3 — Learning-state blob: interval daily goal + history

- **Objective:** persist and sync the interval daily goal and a capped answer
  history, separate from notes. **No interval path/checkpoint record.**
- **Files:** `src/learning/learningState.ts`; `scripts/check-intervals.mts`.
- **Changes:** add `intervalDaily` (OD-5) and `intervalHistory` (OD-6, capped
  ~200 rows of `{ semitones, dir, form, correct, seconds, createdAt }`) to
  `InstrumentLearningState`; extend `emptyInstrumentState`,
  `normalizeInstrumentState` (`normalizeDaily` reuse + new
  `normalizeIntervalHistory`), `mergeInstrumentState` (`mergeDailyGoal` +
  history concat-dedupe-cap). Migration `0015` doc-only note.
- **Does:** two additive model fields with their own normalise/merge.
- **Does NOT change:** `srs`, `intervalSrs`, `daily`, `path` normalise/merge;
  `learningSync.ts`; **adds no checkpoint record**.
- **Dependencies:** none (parallel with T2).
- **Acceptance:** a pre-`0015` blob normalises with the two new fields empty;
  `recordIntervalAnswer` still touches only `intervalSrs`; a note Teacher answer
  leaves both new fields intact; history caps at ~200 and merges without dups.
- **Verification:** extend `check-intervals.mts` (legacy-blob round-trip, field
  isolation, merge, cap); build + lint.

### T4 — Interval planner + weakness

- **Objective:** guided interval sessions chosen by due / weak / current group.
- **Files:** `src/learning/intervalWeakness.ts` (new);
  `src/learning/intervalDrill.ts` (grow) or `intervalPlanner.ts` (new).
- **Changes:** `analyzeIntervalWeakness` (over `intervalHistory` + `intervalSrs`);
  `buildIntervalDailyPlan`, `buildIntervalWeakSpotsPlan` → `DrillConfig` with an
  ordered `interval.semitones` pool. Priority: overdue → weak → **current
  curriculum group's not-yet-mastered** (from `currentGroupIndex(masteredSizes)`)
  → consolidation → coverage. Confuser injection from the current group. Keep
  `buildIntervalDrill` for manual sessions.
- **Does:** pure planning over `intervalSrs` + `intervalHistory` +
  `INTERVAL_CURRICULUM`.
- **Does NOT change:** `planner.ts`, `weakness.ts`, note `buildDailyPlan`.
- **Dependencies:** T1, T2, T3, and **T5** (shares `src/learning/intervalDrill.ts`
  and needs the migrated `interval` spec — do T5 first, or rebase this onto it).
- **Acceptance:** overdue first; weak next; current-group unmastered next; always
  a non-empty pool; confuser pair completed when one member is present;
  weak-spots plan `null` when nothing qualifies; the "current group" is computed,
  never read from storage; **the emitted plan always carries
  `difficulty: 'mixed'` and `direction: 'both'`** (the planner never selects
  `focused` / `full` — §13.5; keep the existing `direction === 'both'` check
  passing).
- **Verification:** extend `check-intervals.mts`; build + lint.

### T5 — Engine: the two interval exercises + the `interval` spec migration

- **Objective:** the engine runs *Identify the interval* and *Find the target
  note*, both directions, answered by chip selection; the P4 `form` /
  `IntervalForm` model is **fully migrated** to the `exercise` model across the
  whole codebase; a session can be started (from the existing `IntervalCard`)
  and completed **in the browser**; `npm run build` + `npm run lint` are green.
- **Scheduling:** T5 has **no upstream dependency** — schedule it **first**,
  parallel with T1 / T3. T4's planner builds on T5's renamed spec (if T4 lands
  first it writes `form` and rebases here). `src/learning/intervalDrill.ts` is
  edited by **both** T4 and T5 — never run them simultaneously.
- **Files (complete — nothing spills over):**
  - `src/utils/intervals.ts` — **delete `IntervalForm`**; `IntervalDrillSpec`:
    `form` → `exercise: 'identifyInterval' | 'findTargetNote'`,
    `direction: 'up' | 'down' | 'both'`. The neck math
    (`noteNameAtSemitones` — already sign-safe, `positionMidi`,
    `semitonesBetween`, `targetPositionsForInterval`) is **unchanged and kept**
    for the Future neck extension (§8.5).
  - `src/drill/DrillConfig.ts` — the `interval?` sub-type mirrors the above; add
    optional `optionCount?: number`.
  - `src/hooks/useGameEngine.ts` — replace the `form` switch with an `exercise`
    switch. `identifyInterval`: new branch — sequential two-note playback
    (low→high / high→low per `dir`), a new `selectInterval(semitones)` answer
    entry on the hook's return, grade against the played interval.
    `findTargetNote`: the existing target-note generator (the `byName` logic)
    with `±semitones` per `dir`, first note sounded on start, answered via note
    chips. **Remove the now-unreachable `onNeck` branch** (its reference-dot +
    fret-tap glue); **keep** `tagInterval` and the reference / first-note
    picking. Both branches emit one row tagged `intervalItemId` + `form`
    (`'identify'`/`'findNote'`) + `dir` (`'up'`/`'down'`).
  - `src/components/IntervalChoiceRow.tsx` — **new.** Two variants: interval
    chips (Exercise A) and note chips (Exercise B, OD-11). Reuses chip styles.
    `NoteCircle` is **not** used.
  - `src/components/IntervalPrompt.tsx` — `exercise`-aware copy: "Which interval
    did you hear?" (A) / "M3 above|below G" (B); "🔊 hear it again" for A.
  - `src/components/IntervalCard.tsx` — the two-button toggle becomes
    *Identify* / *Find the note*; `onStart(exercise)`. Direction defaults to
    Both. Stays the interval-session entry point until T6's Selector supersedes
    it.
  - `src/components/IntervalPracticeScreen.tsx` — thread `exercise` through
    `onStart`; no structural change.
  - `src/hooks/useLearning.ts` — `buildIntervalPlan(exercise)` signature; update
    the `buildIntervalDrill(...)` call.
  - `src/learning/intervalDrill.ts` — `buildIntervalDrill` emits
    `interval: { semitones, direction, exercise }` (was `form`); default
    `direction: 'both'`.
  - `src/App.tsx` — render the correct `IntervalChoiceRow` variant in the
    question area while an interval session runs; wire its selection to
    `selectInterval` / the note-answer handler; keep the `IntervalCard` entry.
    Minimal — enough to launch and answer a session in `npm run dev`.
  - `scripts/check-intervals.mts` — spec-shape, tagging, and note-run-unchanged
    assertions.
- **Option set (T5 keeps it simple):** a fixed `optionCount` (e.g. 4) with the
  true answer + random distinct distractors from the pool. The §9 tiers
  (confuser guarantees, option count by difficulty, first-note bias, register)
  are wired in T7 — T5 must not block on them.
- **Does:** both exercises, both directions, run through `useDrillSession`
  unchanged; a session runs end-to-end in the browser.
- **Does NOT change:** note byFret/byNote branches in `useGameEngine`;
  `useDrillSession`; `deriveDrillConfig`; `NoteCircle`, `FretGrid`; anything
  under `src/game/**`; the neck math in `intervals.ts`.
- **Dependencies:** none (schedule first).
- **Acceptance:** `npm run build` + `npm run lint` green with **no** leftover
  `form` / `IntervalForm` / `onNeck` reference; a note-only run is
  byte-identical; Exercise A hides the note names until answered and re-plays on
  demand; ascending & descending both yield correct targets; each question emits
  exactly one tagged SRS row (`form` + `dir`); timeout ⇒ one `null` row.
- **Verification:** `check-intervals.mts`; `npm run build`; `npm run lint`;
  manual in `npm run dev` — start from `IntervalCard`, run both exercises in
  both directions (per `web-and-android-feature-parity`, the browser build, not
  only Android).

### T6 — `useIntervalSelector` + Interval Selector UI

- **Objective:** a Selector that feels like the Notes one.
- **Files:** `src/hooks/useIntervalSelector.ts` (new);
  `src/components/IntervalSelectorPanel.tsx` (new);
  `src/components/IntervalPracticeScreen.tsx` (host it);
  `src/i18n/translations.ts`; selector CSS reuse.
- **Changes:** persisted fields (`isel_exercise`, `isel_selection`,
  `isel_group`, `isel_single`, `isel_difficulty`, `isel_direction`); **no
  `isel_autoAdvance`** (Auto Advance is not in the MVP — §5.5); derived
  settings; `buildDrill()` → `DrillConfig` with `interval` spec; the panel
  (exercise, interval selection, difficulty, direction, "?" summary, Start).
- **Does:** manual interval session configuration; the Selector becomes the
  primary entry, `IntervalCard` folds in or stays a compact shortcut (§5.7).
- **Does NOT change:** `useSelector`, `SelectorPanel`; the engine (T5 already
  built it).
- **Dependencies:** T1, T5.
- **Acceptance:** every control changes the emitted `DrillConfig`; "One
  interval" clamps difficulty to focused; direction control sets
  up/down/both and defaults to Both; Hebrew layout via `dir`; all copy via
  `t()`; picks persist across reload; no Auto Advance toggle present.
- **Verification:** manual run on web (per `web-and-android-feature-parity`
  memory — must work in the browser build, not only Android); build + lint.

### T7 — Difficulty model wired end to end

- **Objective:** a shared `intervalDifficulty(tier, sizes, group, masteredSizes)`
  function whose three tiers change pool / option set / first-note / register /
  direction / timer / count per §9.3.
- **Files:** a shared difficulty module (in `intervalDrill.ts` /
  `intervalPlanner.ts`); `useIntervalSelector.ts` (Selector passes the tier);
  `useGameEngine.ts` (consume `optionCount` + option-set rules); translations.
- **Changes:** implement all three tiers per §9.2 / §9.3, including
  `focused` → `direction: 'up'` when the given sizes are not-yet-mastered.
  **The Selector passes the tier the learner picked. The planner always passes
  `mixed`** — it does not call `focused` / `full` (§13.5). `focused` is
  therefore reachable in the MVP only from the Selector.
- **Does:** one difficulty function; the Selector drives it across all three
  tiers, the planner drives only `mixed`.
- **Does NOT change:** note `Difficulty`, `getTime`, `getMaxQuestions`; the
  planner's fixed `mixed` / `both` envelope (T4) — that stays.
- **Dependencies:** T4, T5, T6.
- **Acceptance:** the three tiers produce the §9.3 values; **called with
  `focused` + not-yet-mastered sizes → `direction: 'up'`, 3 options, no near
  confuser, natural-first-note bias** (tested directly, not via the planner);
  `mixed` / `full` complete the current group's in-pool confuser pairs and
  include both directions; a guided plan still comes out `mixed` + `both` (the
  existing `check-intervals.mts` `direction === 'both'` assertion is **not**
  changed).
- **Verification:** extend `check-intervals.mts`; manual playtest.

### T8 — Interval progress board + Stats (reads only)

- **Objective:** the flat 11-interval status board + the §15.1 numbers.
- **Files:** `src/components/IntervalBoard.tsx` (new);
  `src/components/IntervalStatsPanel.tsx` (new) or a `ProgressPanel` section;
  `src/hooks/useLearning.ts` (`intervalBoard` from `buildIntervalBoard`);
  translations.
- **Changes:** render the 11 rows (size, *not started / learning / mastered*,
  recent-accuracy bar) reusing the Notes mastery-grid cell styling; header
  `n / 11 mastered` + "currently learning: <group>". Numbers from §15.1.
- **Does:** read-only progress view. **No path screen, no checkpoints, no
  stars, no state pill, no "n/7".**
- **Does NOT change:** `ProgressPanel` note sections; the Notes mastery overlay;
  `LearningPathScreen`.
- **Dependencies:** T1, T2.
- **Acceptance:** board reconciles with `intervalSrs`; a fresh user sees 11
  `notStarted` rows; no points / XP / streak / badge / star / checkpoint element
  anywhere.
- **Verification:** manual; build + lint.

### T9 — Interval Daily / Teacher (Today card)

- **Objective:** "today's intervals" + "practise my weak intervals" + "why
  these?" + an exercise toggle.
- **Files:** `src/components/IntervalTodayCard.tsx` (new);
  `src/hooks/useLearning.ts` (`intervalTodayPlan`, `intervalWeakSpotsPlan`,
  `intervalDailyGoal`); `IntervalPracticeScreen.tsx` (host, Premium);
  `src/App.tsx` (start a planned interval session); translations.
- **Changes:** build plans from T4; render with `.teacher-card` classes; goal
  bar on `intervalDaily`; why-list with interval reasons; a toggle that sets
  which exercise the guided session runs (default *Find the target note*).
  **No "View your Learning Path" link.**
- **Does:** guided daily interval practice.
- **Does NOT change:** `TodayCard`, note `buildDailyPlan`, note `DailyGoal`.
- **Dependencies:** T3, T4, T8.
- **Acceptance:** a planned session drills exactly the plan's pool with the
  chosen exercise; goal ticks on `intervalDaily` only; weak-spots button
  disabled when no weak intervals; interval run still skips personal-best /
  badges / leaderboard.
- **Verification:** manual; `check-intervals.mts`; build + lint.

### T10 — Educational content inline

- **Objective:** description / semitones / comparison / role / 🔊 replay in the
  right moments; optional neck hint as a secondary disclosure.
- **Files:** `IntervalPrompt.tsx`, feedback rendering in `App.tsx`,
  `IntervalSelectorPanel.tsx` ("about this interval"), `intervalContent.ts`
  consumers; `audio.ts` used for the 🔊 replay (no change to `audio.ts`).
- **Changes:** show content from `intervalContent.ts` on a miss and on demand;
  the "hear it (again)" control; Exercise A reveals the two note names in
  feedback.
- **Does:** weave §7 content into existing surfaces.
- **Does NOT change:** `audio.ts`; no new theory screen.
- **Dependencies:** T1, T5.
- **Acceptance:** every quality has description + comparison + role rendered
  somewhere reachable; all via `t()`.
- **Verification:** manual walk of all 11; build + lint.

### T11 — UI polish / parity pass

- **Objective:** Intervals reads as the same product as Notes.
- **Files:** interval components + `styles/*` (reuse only).
- **Changes:** spacing, RTL, empty/loading states, `busy` disabling, `click()`
  wrapper on every control.
- **Does NOT change:** any `styles/*` token or Notes-only rule; no new stylesheet.
- **Dependencies:** T6–T10.
- **Acceptance:** side-by-side with the Notes Selector / Today / mastery grid,
  the visual language matches; Hebrew correct throughout.
- **Verification:** manual, web + Android.

### T12 — Integration & regression verification

- **Objective:** prove the separation invariants (§22).
- **Files:** `scripts/check-intervals.mts`, `scripts/check-learning.mts`,
  `scripts/check-learning-path.mts` (read-only assertions).
- **Changes:** add the §22 assertions.
- **Dependencies:** T1–T11.
- **Acceptance:** §22 checklist all green; `npm run build` + `npm run lint`
  clean; all three `check-*.mts` pass.
- **Verification:** run everything; manual smoke of Notes practice, Notes
  Teacher, Notes Path (stars intact), Game entry.

### Order adjustments vs the requested sequence

- **Recommended real order: T5 first** (it has no upstream dependency and owns
  the `interval` spec migration that T4 and T6 both build on), in parallel with
  T1 / T3. Then T2 → T4 (planner) and T6 (Selector) → T7 (difficulty). The
  task *numbers* are kept stable for reference; the *schedule* leads with T5.
  A Selector or planner built before the migrated `interval` spec exists would
  be throwaway.
- **No "Learning Path" task.** Intervals has no path/checkpoint screen
  (product-owner decision — "no stages"); progress is the flat 11-interval board
  built in T8. 12 tasks, not 13.
- **Auto Advance is not in the MVP** (OD-3, "maybe later"). No task builds it or
  `intervalStageSequence.ts`. Interval practice is free Selector practice; the
  only guidance is the Teacher/Today card.
- **Ascending and descending are both in the MVP** (OD-10), folded into T5
  (engine), T6 (Selector direction control) and T7 (difficulty).

---

## 22. Verification / regression plan

Automated (manual-run `check-*.mts`, no test runner in repo) + a manual
checklist. All must pass before each shared-infra task merges and again at T12.

### 22.1 Separation invariants (assert in scripts)

1. `recordIntervalAnswer` mutates only `intervalSrs` — note `srs`, note `daily`,
   `path` byte-identical.
2. `recordTeacherAnswer` / `recordPracticeAnswer` leave `intervalSrs`,
   `intervalDaily`, `intervalHistory` byte-identical.
3. No id in `srs` matches `isIntervalItemId`; no id in `intervalSrs` parses as a
   note id (`parseNoteItemId` → `null`).
4. `analyzeWeakness` / `buildDailyPlan` never receive or emit an `interval:` id.
5. `LearningPathScreen.tsx`, `path.ts`, `pathProgress.ts`, `recordCheckpointStars`
   are **completely untouched** — the Notes Path and its stars are byte-identical.
6. A pre-`0015` blob (no `intervalDaily` / `intervalHistory` keys) round-trips
   through `normalizeLearningState` → `mergeLearningState` with note fields
   unchanged and the two new fields defaulted empty.
7. `mergeInstrumentState` merges `intervalDaily` (`mergeDailyGoal`) and
   `intervalHistory` (concat-dedupe-cap); **no `intervalPath` field exists.**
8. An interval run: `wasIntervalRunRef` true ⇒ no personal-best write, no badge
   sweep, no leaderboard upsert, no row in `allHistoryEntries`.
9. `src/game/**` imports nothing from `learning/interval*`; and no
   `learning/interval*` file imports anything from `src/game/**` at all.
10. Grep: no `★` / `evaluateStars` / `bestStars` / `StarRating` / `checkpoint` /
    `bestPct` in any `*interval*` source file.

### 22.2 Behaviour preserved (manual)

- Notes: Selector picks, byFret/byNote, difficulty, Auto Advance, SpeedBar,
  feedback, Auto Advance chaining — unchanged.
- Notes Teacher: Today card, weak spots, daily goal, "why these?" — unchanged.
- Notes Learning Path: checkpoints, % mastered, **stars**, unlock, current/next
  — unchanged (its file is not edited).
- Game: `LearnHub` "Game" tile still inert; no Game screen wired; Game curriculum
  sync untouched; no stars leak into Learning.
- Note practice types (byFret, byNote) still run unchanged; the dormant P4
  `onNeck` code path does not break the build.
- i18n: no raw English literal for a new string in either language; RTL correct.
- Persistence/sync: sign-out clears the blob; a second device merges interval
  progress without loss; offline still works (localStorage first).

### 22.3 New behaviour (manual)

- Exercise A (Identify the interval): two notes play in sequence (low→high when
  ascending, high→low when descending); the note names are hidden until an
  answer; the interval-chip answer grades correctly; "hear it again" replays.
- Exercise B (Find the target note): first note + interval + direction shown and
  the first note sounded; the note-chip options grade correctly by enharmonic
  match for both "above" and "below".
- Direction: the Selector's Ascending / Descending / Both control changes the
  drill; Both mixes directions per question; a descending M3 and an ascending M3
  review the same `interval:4`.
- Interval Selector: each control changes the drill; picks persist; "One
  interval" clamps difficulty to focused; no Auto Advance toggle exists.
- Difficulty: the Selector's focused/mixed/full produce the §9.3 envelope
  (option count, first-note bias, register, direction, timer); mixed/full
  complete the in-pool confuser pairs. **Called with `focused` + not-yet-mastered
  sizes, `intervalDifficulty` returns `direction: 'up'`** (checked directly).
- Guided sessions: a planned interval session always comes out `mixed` + both
  directions (planner never selects `focused` / `full`).
- Interval SRS: a wrong answer brings the quality back next guided session; a
  correct streak spaces it out; timeout = wrong.
- Interval progress board: 11 rows, each *not started / learning / mastered* +
  an accuracy bar; header `n / 11 mastered` + "currently learning: <group>".
  **No checkpoints, no lock icons, no % stage bar, no stars, no path screen.**
- Interval Today card: planned session drills exactly the plan with the chosen
  exercise; goal ticks on the interval goal only; no "Learning Path" link.
- Interval Stats: `n/11` mastered, per-quality accuracy/time; no `n/7`, no
  stars, no checkpoints.
- Web parity: everything above works in `npm run dev` / the PWA build, not only
  the Android app.

---

## 23. Explicit non-goals & Game separation

**Non-goals for this work:**

- Any Game mechanic (points, combo, achievements, stars, Worlds, Stages, XP) in
  Intervals Learning.
- **Stars of any kind**, and **no new stars in Notes Learning**. Stars are
  Game-only.
- **Any stage ladder** — no Interval Learning Path screen, no checkpoints, no
  locked/unlocked stages, no per-stage % bars or completion tiers, no stored
  progress record. Progress is the flat 11-interval board (§12). The curriculum
  (§6) is a Teacher-internal ordering only.
- Any **neck-position exercise** — "find the target fret", "find a note on the
  neck given an interval", or a fretboard-shape trainer. Future (§8.5). The P4
  `onNeck` code is left dormant, not deleted.
- Any listening exercise beyond the single Exercise A; harmonic (simultaneous)
  intervals; "name the interval between two dots"; interleaving both exercise
  forms in one session; **Auto Advance / a fixed stage sequence** (Future,
  §8.5 / §9.4). *(Descending **is** in the MVP — OD-10.)*
- Wiring interval exercises into `src/game/**` (a possible *future* effort,
  unrelated to this spec).
- Unifying the note and interval SRS schedules / daily goals / histories.
- Per-root or per-string-set interval items (Future — OD-1).
- An interval fretboard-shape mastery overlay (Future).
- A standalone interval theory screen.
- Adaptive promote/demote suggestion banner for intervals (Future).
- Touching Notes Learning, Notes SRS, Notes Mastery, Notes Learning Path (incl.
  its stars), Game curriculum, Game scoring, Game achievements, Game
  progression.

**Game separation, restated:** Intervals Learning shares only the
domain-agnostic *engine* seams (drill runner, Leitner SRS, blob+sync,
scoring/feedback infra, UI shells, entitlement). It imports **nothing** from
`src/game/**` — no `meetsGoal`, no `evaluateStars`, no `StarRating`. There is no
checkpoint, no star, no % stage bar. Progress is *not started / learning /
mastered* per interval, and `n / 11 mastered`.

---

## 24. Open Decisions — all resolved

Every decision below was settled by the product owner on 2026‑09‑07. Kept here
as a record; nothing in this list is still open.

| # | Decision | Resolution | Where it lands |
|---|---|---|---|
| OD-1 | Item granularity | **Quality-only** — 11 items, `interval:<n>`. Contextual granularity is Future. | §4 |
| OD-2 | "All learned" scope | **All 11** whenever the learner has never engaged the Teacher's curriculum flow; otherwise the intervals introduced so far. No content lock either way. | §5.2 |
| OD-3 | Auto Advance / stage sequence in the MVP | **Not in the MVP** ("maybe later"). Interval practice is free Selector practice; the only guidance is the Teacher/Today card. | §5.5, §8.5, §13.6 |
| OD-5 | Daily goal | **Separate `intervalDaily`**. Interval reviews never tick the note goal. | §14, §17 |
| OD-6 | Interval history persistence | **Persisted, capped (~200 rows), synced exactly like the rest of the learning state.** Never mixed into note history. | §10.5, §15.2, §17 |
| OD-7 | Guided-session exercise | **One exercise per session**, chosen on the Today card, default *Find the target note*. Interleaving forms is Future. | §13.1 |
| **OD-8** | **Progress surface** | **No Learning Path / checkpoint screen at all** ("no stages"). Progress is a **flat 11-interval status board** — *not started / learning / mastered* per interval, like the Notes mastery/stats view. No stars, no % stage bar, no stored progress record. | §0, §6, §11, §12, §15 |
| OD-9 | `check` script | **One script** — `check-intervals.mts` covers curriculum data + mastery + planner + engine. No separate path script (there is no path). | §21 |
| OD-10 | Ascending vs descending | **Both, in the MVP — one feature.** Same `interval:<n>` SRS item drilled in either direction; direction is a Selector control + a difficulty dimension, recorded as `dir` on the row. | §4.1, §5.3, §8, §9, §10.3 |
| OD-11 | Exercise B answer surface | **Note-chip row** (not the `NoteCircle`), consistent with Exercise A's chip row. | §8.2, §16 |
| OD-12 | Exercise A — reveal notes | **Note names hidden** during the question, revealed in feedback (it is an ear exercise). | §8.1 |
| OD-13 | Exercise B — sound the first note | **Yes** — one note on question start, to reinforce the sound association. | §8.2 |

(The previous draft's OD-4 — on-neck target acceptance — is gone: the MVP has no
neck exercise.)

### Still genuinely open (minor, not blocking)

- **Tuning numbers** — the §9.3 envelope (question counts, timers, option
  counts), the `readyRatio` for `currentGroupIndex` (§6.3), the mastery
  constants (§11.1), the `intervalDaily` target (§14.2). All **first drafts to
  tune in playtest**.
- **Whether `IntervalCard` stays a compact entry or is fully absorbed into the
  Selector** (§5.7) — a minor UI call for whoever builds T6.
- **Whether the board rows carry a "practise this" button** (§12.4) — the
  Selector already covers it; optional for the MVP.
