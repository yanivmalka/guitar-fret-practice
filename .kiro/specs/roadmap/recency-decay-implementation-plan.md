# Recency Decay Model — Implementation Plan

Status: **plan only. No code is changed by this document.** It is the step-by-step
plan a developer implements from, after every product decision it raised was
resolved by the product owner (see §3). What remains open is only the numeric
re-tuning of the accuracy / speed thresholds (§3 item 6), which will be proposed
during implementation and signed off before it lands.

Reference documents:
- `product-wishlist.md` → "Recency model: exponential time-decay for the
  practice-statistics windows" — the approved spec this plan implements. That
  section is the source of truth; this plan does not restate or change it.
- `premium-product-plan.md` §9 P2 / P3 / P4 — the learning-layer roadmap slots
  the three touched modules belong to.
- `notes-system-map.md` — the pedagogical + technical map of the Notes learning
  domain.

---

## 0. What changes, in one paragraph

Today every recency-scoped statistic in the learning layer uses the same shape:
take the last `windowSize` answers for a position, drop anything past a hard
`maxAgeDays` cutoff (45), then treat every surviving answer equally. This plan
replaces that with an **exponential time-decay weight**: each answer gets
`w = 0.5 ** (ageMs / halfLifeMs)` with a **14-day half-life**; a position's
recent accuracy is the weighted mean `Σ(w·correct) / Σ(w)` and its **effective
sample size** is `effectiveN = Σ(w)`. A **180-day hard cap** stays, purely as a
performance / storage bound. The evidence gate moves from
`attempts >= minAttempts` to `effectiveN >= 3`. The raw-count "repeated recent
misses" trigger (2 misses within the last 4 answers) stays **unweighted**. Each
position gets a **continuous 0..1 score**.

---

## 1. Scope

**In scope now — three modules:**
- `src/learning/weakness.ts` — `analyzeWeakness` (feeds the notes daily plan).
- `src/learning/intervalWeakness.ts` — `analyzeIntervalWeakness`.
- `src/learning/intervalMastery.ts` — `windowStats` / `isIntervalMastered` /
  `intervalStatus` / `buildIntervalBoard`.

Plus the direct consumers that need a mechanical follow-through:
- `src/learning/planner.ts` — a field rename only, no logic change.
- `src/hooks/useLearning.ts` — swap one constant for the new display-window
  constant.
- `scripts/check-learning.mts`, `scripts/check-intervals.mts` — new assertions.
- `scripts/check-learning-path.mts` — a `TODO` comment only.

**Deliberately deferred (a later pass, not this one):**
- `src/learning/pathProgress.ts` folds onto the same shared helper. This is where
  the continuous-checkpoint-% change actually lands, along with the green-dot
  gradient and the fate of the "N / M positions" line. Until then the Path keeps
  its `createdAt`-sorted trailing-window mastery test as a stopgap.

**Untouched:**
- `leastPractisedPositions` in `weakness.ts` — lifetime attempt count by design;
  it is the coverage fallback that keeps a plan available for a low-history user.
- The `learningState.ts` blob shape, `learningSync.ts`, `mergeSrsItem`,
  `mergePathProgress`. No storage-shape change, no SQL migration.
- `product-wishlist.md` and `premium-product-plan.md`.

---

## 2. Approved parameters (from the wishlist spec)

- Answer weight: `w = 0.5 ** (ageMs / halfLifeMs)`.
- Half-life: **14 days**.
- Hard cap: **180 days** — rows older than this are dropped entirely, as a
  performance / storage bound only. A row with no usable `createdAt` counts as
  too old, exactly as today.
- Evidence gate: **`effectiveN >= 3`** for notes (matching today's
  `minAttempts: 3`).
- The "repeated recent misses" trigger (2 of the last 4 answers) stays a **raw,
  unweighted** count, so a position the learner just bombed still surfaces
  immediately.
- Per-position score is **continuous 0..1**. `evaluateStars` / `meetsGoal` are
  **not** touched — they already take a number.

---

## 3. Product-owner decisions (resolved 2026-09-08)

1. **`positionScore` blend curve.** The SRS bucket is used **only as a floor, and
   only when there is not enough fresh evidence** (`effectiveN < minEffectiveN`).
   Once `effectiveN >= minEffectiveN` the score is the weighted accuracy alone —
   the bucket plays no part, not even as a floor. So a well-scheduled position
   with recent evidence of struggling **can** lose its status.
2. **Bucket → score mapping.** Not `bucket / MAX_BUCKET`. A lookup table:
   `BUCKET_SCORE = [0, 0.3, 0.6, 0.85, 0.9, 0.95, 1.0]` (index = bucket 0..6).
   Bucket 3 maps to 0.85 so it still clears the "mastered" line, matching
   today's "bucket >= 3 alone ⇒ known" behaviour when recent evidence is thin.
   The 1 and 2 values are secondary tuning (they only apply when evidence is
   already thin) but are fixed here for determinism.
3. **Interval evidence gate stays stricter.** Intervals keep the equivalent of
   **4** recent answers (`effectiveN >= 4`), not 3 — there are only 11 qualities
   and a short lucky streak is easy. Notes stay at 3.
4. **Interval Stats display window stays 45 days.** A **separate** constant
   `INTERVAL_STATS_WINDOW_DAYS = 45` feeds the Stats headline numbers and the
   11-row board's accuracy bar. The 180-day cap feeds only the decay engine
   behind the `notStarted` / `learning` / `mastered` classification.
5. **The "slow" signal is time-weighted too.** `avgCorrectSeconds` becomes a
   recency-weighted mean of the correct answers' seconds, behind the same
   `effectiveN` gate as accuracy.
6. **Accuracy / speed thresholds are re-tuned for the weighted mean.** New values
   for `lowAccuracy` (notes + intervals), `INTERVAL_MASTERED_ACCURACY` and
   `slowSeconds` will be proposed during implementation, validated against
   check-script scenarios, and signed off by the product owner before landing.
   Until then the current numbers stand.
7. **Field rename.** `recentAccuracy` on `WeaknessSignal` /
   `IntervalWeaknessSignal` becomes `weightedAccuracy`; a new `effectiveN: number`
   field is added alongside. `attempts` stays a raw surviving-row count, for
   display only.
8. **Hard cap is a read filter, never a delete.** Rows past 180 days (or with no
   timestamp) are excluded from the computation and the display only. They are
   **never** removed from `localStorage` / IndexedDB / Supabase.

---

## 4. Step-by-step plan

### Step 0 — Prep / baseline (serial, first)

1. `git fetch origin`; confirm `HEAD` vs `origin/main`; work on `main`, staging
   only this change's hunks.
2. Run all three diagnostics and capture a known-green baseline:
   - `node --experimental-strip-types scripts/check-learning.mts`
   - `node --experimental-strip-types scripts/check-learning-path.mts`
   - `node --experimental-strip-types scripts/check-intervals.mts`
3. `npm run build` (`tsc -b` + Vite) for a clean type baseline.

### Step 1 — New shared helper: `src/learning/recency.ts` (serial, blocks 2/3/4)

A pure, domain-neutral module — no React, no clock, no storage, and **no
`notes` / `interval` / `star` / `checkpoint` vocabulary** in names or comments,
so it does not trip the §22 separation scans (`check-learning.mts` asserts
`weakness.ts` never mentions the interval domain; an `import './recency'` line is
fine).

Exports:
- `recencyWeight(ageMs: number, halfLifeMs: number): number` — `0.5 ** (ageMs /
  halfLifeMs)`; clamps negative `ageMs` to 0.
- `weightedAccuracy(rows: ReadonlyArray<{ correct: boolean; atMs: number }>,
  now: number, halfLifeMs: number): { accuracy: number; effectiveN: number }` —
  `effectiveN = Σ w`; `accuracy = Σ(w·correct) / Σ w`, and `0` when `Σ w === 0`.
  Does **not** age-filter — the caller passes rows already inside the 180-day
  cap.
- `weightedMeanSeconds(rows: ReadonlyArray<{ seconds: number; atMs: number }>,
  now: number, halfLifeMs: number): number` — the recency-weighted mean used by
  the "slow" signal (§3 item 5). `0` when empty.
- `positionScore(weightedAccuracy: number, effectiveN: number,
  srsBucket: number | null, minEffectiveN = MIN_EFFECTIVE_N): number`:
  - if `effectiveN >= minEffectiveN` → return `weightedAccuracy` (bucket ignored);
  - else → return `max(weightedAccuracy, floor)` where
    `floor = srsBucket == null ? 0 : BUCKET_SCORE[srsBucket]`.
- Constants: `DEFAULT_HALF_LIFE_DAYS = 14`, `HARD_CAP_DAYS = 180`,
  `MIN_EFFECTIVE_N = 3`, `BUCKET_SCORE = [0, 0.3, 0.6, 0.85, 0.9, 0.95, 1.0]`,
  `DAY_MS`. `MAX_BUCKET` is not needed here now that the mapping is a table, but
  a dev may assert `BUCKET_SCORE.length === MAX_BUCKET + 1` in the check script.

Nail down every exported signature in this step so the three lanes below are
truly independent.

### Step 2 — `src/learning/weakness.ts` (lane A)

- Keep the pre-group age filter; change its cutoff from `maxAgeDays` (45) to
  `HARD_CAP_DAYS` (180). A row with no parseable `createdAt` is still dropped.
- Remove `rows.slice(-cfg.windowSize)` and the window concept. Still sort a
  position's rows by `createdAt` for the mistake-lookback tail.
- Per position: map surviving rows to `{ correct: e.correct === true,
  atMs: Date.parse(e.createdAt) }`, call `weightedAccuracy(...)`.
- `WeaknessSignal`: rename `recentAccuracy` → `weightedAccuracy`; add
  `effectiveN: number`; `attempts` stays the raw surviving count.
- `lowAccuracy` gate: `effectiveN >= cfg.minEffectiveN && weightedAccuracy <=
  cfg.lowAccuracy`.
- `slow` gate: same `effectiveN` gate; `avgCorrectSeconds` becomes
  `weightedMeanSeconds(correctRows, now, halfLifeMs)`.
- `recentMistakes`: unchanged — raw count over the last `mistakeLookback`
  chronological rows.
- `score` math shape unchanged (it already reads the continuous accuracy).
- `WeaknessConfig` / `DEFAULT_WEAKNESS_CONFIG`: drop `windowSize`; rename
  `minAttempts` → `minEffectiveN` (value 3); `maxAgeDays: 45` → `180` (or drop it
  for `HARD_CAP_DAYS`); add `halfLifeDays: 14`; keep `lowAccuracy`, `slowSeconds`,
  `mistakeLookback`, `mistakeThreshold`.

### Step 3 — `src/learning/intervalWeakness.ts` (lane B)

Mirror step 2 over `analyzeIntervalWeakness`:
- `cutoff` 45 → 180 days; rows with a non-finite `createdAt` still dropped.
- Remove `sorted.slice(-cfg.windowSize)`. Map to `{ correct: r.correct === true,
  atMs: r.createdAt }` (already epoch ms) → `weightedAccuracy(...)`.
- `IntervalWeaknessSignal`: `recentAccuracy` → `weightedAccuracy`; add
  `effectiveN`; `attempts` stays raw.
- `lowAccuracy` / `slow` gate on `effectiveN >= cfg.minEffectiveN` (see step 4
  for the interval value); `avgCorrectSeconds` → `weightedMeanSeconds`.
- `IntervalWeaknessConfig` / `DEFAULT_INTERVAL_WEAKNESS_CONFIG`: drop `windowSize`
  (20); `maxAgeDays` 45 → 180; add `halfLifeDays: 14`; keep the rest.
- The file already names no `notes` / `star` concept — keep it that way.

### Step 4 — `src/learning/intervalMastery.ts` (lane C)

- Replace `windowStats` with a helper-backed `{ accuracy, effectiveN }` (weighted).
  Keep a separate raw surviving-count for the board row's display.
- Drop `INTERVAL_MASTERY_WINDOW` (20).
- `INTERVAL_MASTERY_MAX_AGE_DAYS` (45) → **180** — this is the decay engine's cap.
- Add `INTERVAL_STATS_WINDOW_DAYS = 45` — the display window (§3 item 4). The
  board row's `recentAccuracy` bar and the Stats headline use this plain 45-day
  window; the `notStarted` / `learning` / `mastered` classification uses the
  weighted 180-day model.
- Add `INTERVAL_MIN_EFFECTIVE_N = 4` (§3 item 3). `recentAccuracyOrNull` → gate
  on `effectiveN >= INTERVAL_MIN_EFFECTIVE_N`.
- Keep `INTERVAL_MASTERED_ACCURACY` (0.85, pending §3 item 6 re-tune) and
  `INTERVAL_MASTERED_BUCKET` (3).
- `isIntervalMastered` / `intervalStatus`: derive from
  `positionScore(weightedAccuracy, effectiveN, srsItem?.bucket ?? null,
  INTERVAL_MIN_EFFECTIVE_N)`:
  - `mastered` — `positionScore >= INTERVAL_MASTERED_ACCURACY`;
  - `notStarted` — no `intervalSrs` row, no history inside the cap, score 0;
  - `learning` — anything between.
- `buildIntervalBoard`: `recentAccuracy` ← plain 45-day ratio; `attempts` ← raw
  surviving count. Optionally add `strength: number` (the continuous score) to
  `IntervalBoardRow` for a later UI; no UI consumes it this pass, so this is
  optional.

### Step 5a — `src/learning/planner.ts` (after lane A)

Mechanical: `averageRecentAccuracy` and the local `signalByItem` type read
`signal.recentAccuracy` → `signal.weightedAccuracy`. No logic change. Confirm
`DEFAULT_WEAKNESS_CONFIG` is still exported/imported.

### Step 5b — `src/hooks/useLearning.ts` (after lane C)

At the interval Stats block (~line 415), consume `INTERVAL_STATS_WINDOW_DAYS`
(45) instead of the renamed `INTERVAL_MASTERY_MAX_AGE_DAYS`. No new wiring — `now`
is already threaded, the helper is called inside the model modules.

### Step 6 — Threshold re-tuning (after lanes A/B/C drafted)

Propose new `lowAccuracy` (notes + intervals), `INTERVAL_MASTERED_ACCURACY` and
`slowSeconds` values calibrated against the weighted mean; validate with the
check-script scenarios below; get product-owner sign-off before locking.

### Step 7 — Check-script assertions

`scripts/check-learning.mts`:
- `recencyWeight(14d, 14d) === 0.5`; `recencyWeight(28d, 14d) === 0.25`.
- `weightedAccuracy([correct@0d, wrong@14d])` → `accuracy ≈ 0.667`,
  `effectiveN ≈ 1.5`.
- `effectiveN` gate: two fresh answers (`Σw ≈ 2`) produce no `lowAccuracy`
  reason even at 0%.
- Update the "months-old bad performance" block: rows ~100 days old now survive
  the 180-day cap but fail the `effectiveN` gate ⇒ still not flagged by accuracy;
  rows past 180 days are dropped entirely; an overdue SRS row still surfaces.
- `positionScore`: rises monotonically with `weightedAccuracy` when `effectiveN`
  is above the gate; uses `BUCKET_SCORE` as a floor only below the gate; returns
  `0` when `effectiveN` is below the gate and `srsBucket == null`;
  `BUCKET_SCORE[3] === 0.85`.
- Keep the existing determinism assertions.
- Keep "planner.ts / weakness.ts contain no reference to the interval domain"
  passing (the `./recency` import does not break it).

`scripts/check-intervals.mts`:
- The same decay assertions for `analyzeIntervalWeakness`, `intervalStatus`,
  `buildIntervalBoard`.
- `INTERVAL_MIN_EFFECTIVE_N === 4`: three fresh interval answers do not judge a
  quality on accuracy; four do.
- Update the 400-day "stale" and "recency horizon" blocks for the 180-day cap.
- Re-run the §22.10 banned-vocabulary scan — must still pass with the new helper
  import.

`scripts/check-learning-path.mts`:
- No logic change. Add a `TODO` noting `pathProgress.ts` still uses the
  `createdAt`-sorted trailing window until the deferred fold-in.

### Step 8 — Manual verification (serial, last)

`npm run build` + all three scripts green, then `npm run dev` with
`devSimulateTier = 'premium'` against real history: the Teacher "Today" pick,
"Practise my weak spots", the 11-interval board, and the Learning Path screen.

---

## 5. Files to change

| File | Change |
|---|---|
| `src/learning/recency.ts` (new) | Pure, domain-neutral helper: `recencyWeight`, `weightedAccuracy → {accuracy, effectiveN}`, `weightedMeanSeconds`, `positionScore` (bucket = floor only below the evidence gate), and constants incl. `BUCKET_SCORE`. No notes / interval / star vocabulary. |
| `src/learning/weakness.ts` | `analyzeWeakness` → weighted accuracy + `weightedMeanSeconds` via `recency.ts`; cutoff 45 → 180; drop the window; gate on `effectiveN >= 3`; `recentAccuracy` → `weightedAccuracy` + new `effectiveN`; `recentMistakes` stays raw. `WeaknessConfig` / `DEFAULT_WEAKNESS_CONFIG` updated. |
| `src/learning/intervalWeakness.ts` | Mirror of `weakness.ts` for `analyzeIntervalWeakness`; drop `windowSize` (20); cutoff 45 → 180; add `halfLifeDays`; `effectiveN` gate (value from step 4); field rename + `effectiveN`. |
| `src/learning/intervalMastery.ts` | `windowStats` → weighted helper; drop `INTERVAL_MASTERY_WINDOW`; `INTERVAL_MASTERY_MAX_AGE_DAYS` 45 → 180; add `INTERVAL_STATS_WINDOW_DAYS = 45` and `INTERVAL_MIN_EFFECTIVE_N = 4`; `isIntervalMastered` / `intervalStatus` derive from `positionScore`; board bar + Stats use the 45-day window; optional `strength` on `IntervalBoardRow`. |
| `src/learning/planner.ts` | Field access `recentAccuracy` → `weightedAccuracy` in `averageRecentAccuracy` + local type. No logic change. |
| `src/hooks/useLearning.ts` | Interval Stats block (~line 415) consumes `INTERVAL_STATS_WINDOW_DAYS` instead of the renamed cap constant. |
| `scripts/check-learning.mts` | Decay-curve, `effectiveN`-gate and `positionScore` monotonicity assertions; update the "100-day stale" block for the 180-day cap. |
| `scripts/check-intervals.mts` | Same decay assertions for the interval modules; `INTERVAL_MIN_EFFECTIVE_N === 4`; update the 400-day / recency-horizon blocks; re-run the §22.10 scan. |
| `scripts/check-learning-path.mts` | `TODO` comment only — flags the deferred `pathProgress.ts` fold-in. |
| `product-wishlist.md` | **No change** — approved spec. |

---

## 6. Parallel vs serial

```
Step 0  (prep / baseline)                         ── serial, first
   │
Step 1  (recency.ts — shared helper)              ── serial, blocks everything below
   │
   ├── Lane A ─ Step 2 (weakness.ts) ─── Step 5a (planner.ts)
   │
   ├── Lane B ─ Step 3 (intervalWeakness.ts)
   │
   └── Lane C ─ Step 4 (intervalMastery.ts) ── Step 5b (useLearning.ts)
   │
Step 6  (threshold re-tune)   ── after A/B/C drafted; overlaps Step 7
Step 7  (check scripts)       ── check-learning after A(+5a); check-intervals after B+C;
   │                             check-learning-path any time (independent)
Step 8  (manual verification) ── serial, last, needs all of the above
```

**Must be serial:**
- **Step 0 → Step 1.** Nothing starts before the baseline is green and the shared
  helper's exported signatures are fixed. Every lane depends on `recency.ts`.
- **Step 8 is last.** Manual `npm run dev` verification needs the whole change.
- Within a lane the order holds: **2 → 5a** (5a follows the `weakness.ts` field
  rename), **4 → 5b** (5b consumes the new `useLearning` constant).

**Can run in parallel (after Step 1):**
- **Lanes A, B and C are independent.** They edit three different files and share
  only the read-only `import './recency'`. If Step 1 nails every exported
  signature up front, they can be built simultaneously — ideal for separate
  worktrees / separate sessions.
- **Step 5a and Step 5b** are independent of each other (different files,
  different lanes).
- **`check-learning-path.mts`** (the `TODO` comment) is independent of
  everything — do it whenever.
- **Step 6 (threshold re-tune)** overlaps **Step 7 (writing the check scripts)** —
  the scripts encode the scenarios the tuning is validated against.

**Partial joins in Step 7:**
- `check-learning.mts` needs Lane A finished (it exercises `analyzeWeakness` and,
  through `buildDailyPlan`, Step 5a).
- `check-intervals.mts` needs **both** Lane B and Lane C (it exercises
  `analyzeIntervalWeakness` and the `intervalMastery` board together).

**Practical minimum path** if one developer works alone: 0 → 1 → 2 → 3 → 4 → 5a →
5b → 6 → 7 → 8. With two or three developers, 2 / 3 / 4 collapse into one slot and
the critical path is 0 → 1 → (max of the three lanes + its 5x) → 6/7 → 8.

---

## 7. Regression risks

1. **Teacher "Today" pick shifts.** A position practised moderately but not
   recently drops out of the accuracy-weak set — e.g. 3 answers ~60 days ago give
   `Σw ≈ 0.15 < 3`. It then surfaces only via an overdue SRS row or raw recent
   misses. This is the intended "gentle sag", but it changes which notes the
   daily session drills. Verify in `npm run dev` as Premium.
2. **A high SRS bucket no longer protects a struggling position** (decision 1).
   An interval at bucket 6 with, say, five recent answers at 50% scores 0.5 and
   drops from `mastered` to `learning` — today it stays `mastered` on the bucket
   alone. Intended, but check interval curriculum-group advancement
   (`masteredSizes` → `currentGroupIndex`) does not thrash.
3. **Curriculum advancement is preserved when evidence is thin** — decision 2's
   `BUCKET_SCORE[3] = 0.85` keeps a bucket-3, low-history quality counting as
   mastered, so `currentGroupIndex` behaves as today except where there is real
   recent evidence of struggle.
4. **Interval Stats headline numbers** move only if the 45-day display window is
   miswired to the 180-day cap — decision 4 keeps them separate; the check script
   should assert the display path uses `INTERVAL_STATS_WINDOW_DAYS`.
5. **Board label vs bar can disagree** by design: the label is the weighted
   180-day model, the bar is the plain 45-day ratio. A position can read
   `learning` with a full-looking recent bar, or vice versa. Acceptable; note it
   in the board's code comment.
6. **Performance.** Each position now scans up to 180 days of rows instead of 45.
   Notes history is not hard-capped the way `intervalHistory` is
   (`INTERVAL_HISTORY_CAP`). The filter + per-position grouping stays `O(n)` once
   over the instrument's history; worth a quick check on a large history.
7. **Determinism holds.** `Σw` is floating-point, but identical inputs run the
   identical operations, so the `check-*` "deterministic" assertions still pass.
8. **Coverage fallback is safe** — `leastPractisedPositions` is untouched, so a
   cold / low-history Premium user still gets a usable plan.

---

## 8. Open items

- **§3 item 6 — the re-tuned threshold numbers.** `lowAccuracy` (notes +
  intervals), `INTERVAL_MASTERED_ACCURACY`, `slowSeconds`. To be proposed with
  the weighted-model rationale during implementation and signed off before it
  lands. Everything else in §3 is locked.
- **Deferred, not open:** the `pathProgress.ts` fold-in and its UI follow-ups
  (continuous checkpoint %, green-dot gradient, the "N / M positions" line). A
  separate pass once this one is in.
