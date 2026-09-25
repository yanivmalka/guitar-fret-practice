# Tab Reading — Design Specification

Status: **Slice 1 built and shipped (2026-09-25).** The product owner asked to
add tab reading; Claude proposed the domain, its four exercises and a
two-slice split, and the owner approved it as proposed ("מתאים. התחל ביצוע"),
including the orientation decision in §3. Slice 2 (chords and technique
symbols) is still open (§12).

## 0. Foundational principle

Tab reading is its **own learning domain**, a sibling of Staff reading,
Scales and Intervals, not a mode of the Notes Selector and not blended into
another domain. It has its own screen, its own SRS lane, its own history,
its own daily goal and its own Progress tab. It is Premium, like every other
content domain.

It shares the **drill engine** with Staff reading (`useReadingEngine`, §6),
because Premium is one learning mechanism, not an engine per domain: the two
domains differ only in what a question holds and how it is drawn.

## 1. Product definition

Four exercises, all built on a fret number written on a tab line:

- **Name the note** — one number is written on one line; pick the note it
  plays from a chip row. The note plays after the answer.
- **Find it on the neck** — one number is written on one line; tap exactly
  that place on the neck. Only the written place counts (the line *is* the
  string), unlike Staff reading where any place with the pitch counts. After
  the answer the right place is shown in green.
- **Write it in tab** (the reverse) — a place on the neck is marked; tap the
  tab line of its string, pick the fret number, press Check.
- **Read a riff** — five numbers in a row; name them in order, then hear the
  riff played back.

## 2. Where it lives

- `LearnHub` tile **Tab reading** (📝), `LearnDomain` `'tabs'`, locked for
  non-Premium users (opens the upgrade page).
- `App.tsx` renders `TabPracticeScreen` as a second home screen, exactly like
  the Staff reading branch. Two tabs, **Practice** and **Progress**.
- The **Daily practice** page shows a separate `TabTodayCard` (§8).
- Feature flag `tabReading: 'premium'` in `src/utils/features.ts`.

## 3. Orientation — the one deliberate break from the app

Every real tab puts **string 1, the thinnest and highest, on the top line**.
The app's necks put the lowest string on top (a standing product rule). The
owner approved this split:

- the tab (`TabNotation`) follows the real-world convention, so the learner
  reads the tabs they will meet everywhere else;
- the neck board beside it (`StaffNeckBoard`) keeps the app's layout;
- the start card says so in one line ("…upside down from the neck in this
  app…"), because this flip is exactly what beginners get wrong — "Find it on
  the neck" and "Write it in tab" train it directly.

When the top and bottom strings share a name (guitar e … E), the top one is
written in lower case, as real tabs do. String names follow the notation and
sharps/flats settings.

The tab is notation, not the instrument: pinned LTR on a Hebrew page and not
mirrored by left-handed mode (same as the staff).

## 4. Item identity (`src/learning/tabItem.ts`)

`tab:<string>:<fret>`. A tab writes a place, not a pitch, so two places that
sound the same are two items — reading them means reading two different
lines. Kept in its own `tabSrs` map, never the note `srs` (whose
`"<string>:<fret>"` ids look alike but mean "name this fret").

## 5. Pool (`src/learning/tabDrill.ts`)

Every (string, fret) inside the chosen range (banjo's short fifth string
respected via `minFrets`). Controls, persisted in `localStorage`
(`tab_exercise`, `tab_range`, `tab_naturalsOnly`):

- **Range:** the Staff reading ranges — 0–3 (default), 0–5, 0–12, 12 to the
  last fret. Only the range constants are shared.
- **Notes:** natural notes only (default) / with sharps and flats. Tabs have
  no key, so there is no key signature.

## 6. Engine (`src/hooks/useReadingEngine.ts`)

The former `useStaffEngine`, generalised: the domain passes `pickItems`
(the items of the next question), `markPosition` (the "write it" exercises)
and `exactPosition` (tab: a neck tap must be the written place). Answers:
`selectName`, `tapPosition`, `answerPitch` (staff) and `answerPosition` (tab).
Staff reading's behaviour is unchanged.

| Exercise | Questions | Seconds per note |
| --- | --- | --- |
| Name the note | 12 | 10 |
| Find it on the neck | 12 | 12 |
| Write it in tab | 12 | 20 |
| Read a riff | 6 riffs × 5 notes | 8 (40 per riff) |

## 7. Picking

`pickTabQuestion` weights by the tab SRS (due 4, new 3, known 1) and never
repeats the previous place. `buildTabRiff`: the first note is an ordinary
pick; each next one is on the same or a neighbouring string and within two
frets (`RIFF_MAX_STRING_STEP` / `RIFF_MAX_FRET_STEP`), never the same place
twice in a row, again SRS-weighted — so a riff sits under one hand. If no
neighbour exists (a sparse naturals-only high range) any other place is used.

## 8. Persistence and cloud

`InstrumentLearningState` carries `tabSrs`, `tabHistory` (ring buffer of 300;
`form` = `nameNote` / `findOnNeck` / `writeTab` / `readRiff`) and `tabDaily`
(target 12, its own goal, never the note or staff goal). They ride the
existing `user_learning_state` blob (`supabase/migrations/0018_*`, doc-only):
SRS merged per item, history as a union, the daily goal per day. The screen
pushes after every answer and re-reads on `learning-synced`. Nothing touches
note history, mastery, badges, the leaderboard or personal bests.

## 9. Progress tab (`tabMastery.ts`, `TabProgressBoard.tsx`)

Every position of the range on a neck grid (app orientation), its fret number
in the tile, coloured not started / learning / mastered with Staff reading's
thresholds (own constants).

## 10. Rendering (`TabNotation.tsx`)

SVG: one line per string, TAB down the start, open-string names on the left,
each number on its line over a knock-out so the line does not cross it.
States: live, current (the riff note to name), correct, wrong, ghost (being
written). With `onPickString` a tap selects the nearest line. CSS:
`src/styles/33-tab-reading.css` (reuses the staff card classes).

## 11. Verification

- `node --experimental-strip-types scripts/check-tabs.mts` — ids, pools for
  every instrument / range / notes setting, picker, riff limits, board
  statuses, `tabDaily` ticking alone, merge, normalisation (foreign ids and
  forms dropped, older blobs get empty fields). `check-staff` and
  `check-learning` still pass.
- Live (Playwright, 400×860, Premium simulated), English and Hebrew: all four
  exercises, the Progress tab, the Learn tile and the Daily practice card;
  answers reach `tabSrs` / `tabHistory` / `tabDaily` with every form, no
  console errors. Staff reading's four exercises re-checked on the shared
  engine.
- Not verified live: the cloud round-trip between two devices (merge covered
  by the check script).

## 12. Still open

1. **Chords** — several numbers stacked in one column; name the chord / find
   the shape.
2. **Technique symbols** — hammer-on (h), pull-off (p), slide (/ \), bend
   (b), vibrato (~), muted note (x), palm mute (PM): read the symbol and say
   what to do.
3. **Rhythm** — tabs usually omit it; a later step could pair tab with the
   staff's rhythm.
4. **Play what you read** — answer a riff by playing it (pitch detection).
5. **Teacher integration** — a planned "today's tab" session with a "why
   these?" list.
