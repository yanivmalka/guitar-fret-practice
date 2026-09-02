# Guitar Fret Practice — Product Wishlist (Selector Model)

Consolidated from `wishlist-requirements.md` (original Stage-based roadmap) and `wishlist-requirements-v2.md` (Selector-model re-plan). Both source files are kept as-is and unmodified — this document is the clean, decision-ready synthesis.

**Ground rules applied here:**
- The Selector Panel (string + fret range + difficulty, chosen directly) is the confirmed current product direction.
- The old Stage navigation model (chevrons, progress bar, stage picker, custom-stage snapshots) is **not** revived anywhere in this document.
- No item from the old roadmap is assumed wanted just because it was written down — anything not clearly re-affirmed by the Selector-model re-plan is marked Unconfirmed rather than promoted or discarded.

---

## 1. Fix Now
Bugs or behavior the product already promises but doesn't deliver.

- **Failed-note re-queue doesn't work.** `failedFretsRef` in `useGameEngine.ts` is written on a wrong answer but never read — the "missed notes come back once" behavior implied by the balanced-questioning design silently doesn't happen.
- **Click sound missing on some buttons.** The `click()` wrapper pattern (sound + haptic) isn't applied consistently — e.g. the game-end "OK" button uses a bare `onClick`, breaking the established interaction convention.
- **Placement test result isn't applied.** Onboarding's 3-question placement test scores the user correctly but then just tells them to go set the Selector Panel manually instead of writing the suggested string/difficulty into `useSelector`'s persisted settings — the feature doesn't complete its own purpose.
- **Dead/orphaned code: `src/components/Settings.tsx` and `src/design-preview/`.** A substantial alternate settings UI exists but is never imported or rendered by `App.tsx`. This isn't a user-facing bug, but it's misleading to anyone reading the codebase and should be resolved (finish it or remove it) rather than left in limbo. — `Settings.tsx` removed (nothing salvageable; its notation toggle and circle-order controls already live in `SelectorPanel`, and its manual time picker was deliberately replaced by `getTime()`). `design-preview/` is kept intentionally as a design lab.

- **All-time stats mix instruments.** — **DONE.** `historyKey()` already prefixes non-guitar combinations (`bass|…`; guitar stays unprefixed for back-compat), so every *per-combination* stat was already instrument-clean, but the all-time roll-ups flattened the map and lost that. `src/utils/mastery.ts` now has `instrumentOfKey(key)` (numeric leading segment ⇒ guitar; any other token ⇒ that instrument id — generalises to future string instruments with no code change) and `historyForInstrument(allHistory, instrumentId)`. `App.tsx` (note-wheel / fret-grid mastery overlays) and `ProgressPanel.tsx` ("All time" scope + Personal bests, via `allBestsSummary(instrumentId)`) now scope to the played instrument. No `HistoryEntry` field, no schema/migration. This is also the prerequisite for the instrument-scoped Badges.

  ### Implementation plan — Instrument-scoped all-time aggregation

  **Goal:** all-time views show only the current instrument's history, and the mechanism generalises to any future string instrument (ukulele, mandolin, 5-string bass, …) with no per-instrument code.

  **Key insight:** a `historyKey` is `"{strings}|{fret}|{mode}|{diff}"` for guitar and `"{instrumentId}|{strings}|{fret}|{mode}|{diff}"` for everything else. The first `|`-segment of a guitar key is always the comma-joined string list — digits and commas only — so any non-numeric leading segment *is* an explicit instrument id. No registry needed.

  **`src/utils/mastery.ts` — new helpers:**
  ```ts
  // The instrument a stored historyKey belongs to. Guitar keys are unprefixed
  // and start with their string list ("3,4|…"); any other leading token is an
  // explicit instrument id ("bass|3,4|…", "ukulele|…"). Future instruments work
  // with no change here.
  export function instrumentOfKey(key: string): string {
    const first = key.split('|', 1)[0];
    return /^[0-9,]+$/.test(first) ? 'guitar' : first;
  }

  export function historyForInstrument(
    allHistory: Record<string, HistoryEntry[]>,
    instrumentId: string,
  ): HistoryEntry[] {
    const out: HistoryEntry[] = [];
    for (const [key, rows] of Object.entries(allHistory)) {
      if (instrumentOfKey(key) === instrumentId) out.push(...rows);
    }
    return out;
  }
  ```
  Keep `flattenHistory` (still used where an explicit cross-instrument total is wanted, and as the pre-migration fallback) but stop using it for the instrument-specific overlays.

  **`src/App.tsx`:** line ~276, replace
  `flattenHistory(historyOps.allHistory)` → `historyForInstrument(historyOps.allHistory, instrument.id)`, so `fretMasteryMap` / `noteMasteryMap` (the wheel + grid equalizer overlays) are scoped to the instrument being played. Update the `useMemo` deps to `instrument.id`.

  **`src/components/ProgressPanel.tsx`:** it already receives the `instrument` prop. Line 325, replace
  `const all = useMemo(() => flattenHistory(allHistory), [allHistory]);` →
  `const all = useMemo(() => historyForInstrument(allHistory, instrument.id), [allHistory, instrument.id]);`
  The "All time" scope caption becomes "across every settings combination for {instrument label}". `allBestsSummary()` (Personal bests expander) should likewise filter by `instrumentOfKey(key) === instrument.id` — add an optional `instrumentId` arg to `allBestsSummary` in `src/utils/progress.ts`.

  **`src/utils/progress.ts`:** no change to `dailyStats` / `practiceStreak` / `lifetimeTotals` / `weakNotes` themselves — they already take a pre-filtered `entries` array; callers just pass the instrument-scoped list now. `allBestsSummary` gains the optional filter described above.

  **Edge cases:**
  - Legacy guitar rows (saved before bass existed) have unprefixed keys → `instrumentOfKey` returns `'guitar'`. Correct.
  - A malformed / empty key → leading segment fails the numeric test → treated as its own "instrument"; harmless (its rows just never match a real instrument). 
  - Cloud sync: unaffected — keys are stored verbatim, the prefix already round-trips.
  - "Clear all history" still wipes everything across instruments (that is its stated contract).

  **Files touched:** `src/utils/mastery.ts` (2 new helpers), `src/App.tsx` (1 call + deps), `src/components/ProgressPanel.tsx` (1 call + caption), `src/utils/progress.ts` (`allBestsSummary` optional filter). No `HistoryEntry` field, no schema/migration.

---

## 2. Finish Current Product
Work needed to make the Selector-based experience feel complete and polished on its own terms — no new product concepts, just closing out what the current model implies.

- **Settings panel polish/completion.** Whatever is salvaged from `Settings.tsx` (time options, notation toggle A-B-C/solfege, circle order) should land inside the live `SelectorPanel.tsx` flow, since these were part of the original settings scope and aren't superseded by anything.
- **`?` info affordance** explaining the clock method / fretboard basics to a new user, auto-dismissing after a few seconds.
- **Toggle button visual state before interaction** (e.g. dashed border to distinguish un-toggled controls) — small discoverability gap in the current UI.
- **Order-switcher layout stability** — confirm the placeholder reserves space so switching between By Fret / By Note doesn't visibly jump the layout.

---

## 3. Confirmed Future Features
Features from the old roadmap that are clearly still desired and map cleanly onto the Selector model with no dependency on Stages, backend, or monetization.

- **Scoring system** — points, speed bonus, streak multiplier, live score counter.
- **Session summary card on stop** — score, streak, accuracy, avg speed, personal best.
- **Celebration tiers** (small win / milestone / major award pulses+haptics) — purely presentational, independent of navigation model.

  ### Implementation plan — Celebration tiers

  Much of this already exists: `celebrateTier1` (cyan ring + floating `+points` on every correct answer), `celebrateTier2` (three gold rings + banner on streak milestone 3/5/10), and `celebrateTier3` (full-screen "NEW BEST!" card at game end) are all wired through `src/utils/feedback.ts`, `src/hooks/useGameEngine.ts`, and `src/App.tsx`. The work is completing and tiering it, not building from scratch.

  **Tier model (four in-session tiers + one end-of-game tier):**

  | Tier | Internal name | Trigger | Typical frequency |
  |---|---|---|---|
  | 0 | `tick` | Correct answer that does not open or continue a streak of ≥3 (i.e. streak 1–2) | Every correct answer early in a round |
  | 1 | `small` | Correct answer at streak ≥3 that is not a milestone | Frequent |
  | 2 | `milestone` | Streak reaches exactly 3 / 5 / 10 | Occasional |
  | 3 | `major` | Streak reaches 15 / 20 / 25 / 30… (`streak >= 15 && streak % 5 === 0`), **or** a new personal best streak is broken mid-game (`streak > longestStreakEver`) | Rare |
  | 4 | `grand` | Game ends with a new personal best score (the existing Tier3) | Very rare |

  Tier 0 keeps the start of a round visually quiet (chime + floating text, no ring) so excitement accumulates. From streak 15 up, every multiple of 5 is `major`, not only 15/20. A new personal-best streak is read from a new single-value localStorage key `stat_longestStreakEver` (all-time, not scoped to `historyKey()`), updated in `onCorrect`; by default it is **not** wiped by "Clear History".

  **`src/hooks/useScoring.ts`:**
  - Add `export type CelebrationTier = 'tick' | 'small' | 'milestone' | 'major';`
  - Extend `ScoreResult` with `tier: CelebrationTier` and `isStreakRecord: boolean` (keep `milestone` for now for backward compatibility).
  - In `onCorrect`, after computing `streak`:
    ```ts
    const prevRecord = loadSetting('stat_longestStreakEver', 0);
    const isStreakRecord = streak > prevRecord && streak >= 5;
    if (streak > prevRecord) saveSetting('stat_longestStreakEver', streak);

    let tier: CelebrationTier;
    if (streak >= 15 && streak % 5 === 0) tier = 'major';
    else if (isStreakRecord) tier = 'major';
    else if (streak === 3 || streak === 5 || streak === 10) tier = 'milestone';
    else if (streak >= 3) tier = 'small';
    else tier = 'tick';
    ```

  **`src/hooks/useGameEngine.ts` — `scoreCorrect`:**
  ```ts
  const scoreCorrect = useCallback((elapsedSeconds: number): ScoreResult => {
    const result = onCorrect(elapsedSeconds, questionTimeRef.current);
    playCorrectChime();
    playStreakTone(result.streak);            // see Audio refinements plan

    if (!showScore) { haptic.correct(); return result; }   // Score off: haptics only

    const scoreEl = document.getElementById('live-score');
    switch (result.tier) {
      case 'tick':
        if (scoreEl) celebrateTier1(scoreEl, `+${result.points}`, '#0ff', { ring: false });
        haptic.correct();
        break;
      case 'small':
        if (scoreEl) celebrateTier1(scoreEl, `+${result.points}`, '#0ff', { ring: true });
        haptic.correct();
        break;
      case 'milestone':
        celebrateTier2(`${result.streak} STREAK!`);
        haptic.milestone();
        break;
      case 'major':
        celebrateMajor(
          result.isStreakRecord ? `NEW BEST STREAK · ${result.streak}` : `${result.streak} STREAK!`,
        );
        haptic.major();
        break;
    }
    return result;
  }, [onCorrect, showScore]);
  ```
  `celebrateTier1` gains an optional fourth argument `{ ring?: boolean }` (default `true`); when `false` it renders only the floating text.

  **Per-tier visuals:**
  - `tick` — floating `+N` in `#0ff`, existing `float-up` animation (800ms), above `#live-score`. No ring.
  - `small` — same, plus the existing cyan ring: `radial-pulse-cyan`, 400ms, 40px start diameter, `border: 2px solid #0ff`, from the centre of `#live-score`.
  - `milestone` — three gold rings `celebrate-ring-gold` (existing: 96px, `border 3px #ffd700`, `radial-pulse-gold` 700ms) with `animation-delay` 0 / 100 / 200ms, from screen centre; plus the existing `milestone-banner` (`top: 34%`, gold, `milestone-drop` 300ms) reading `"{streak} STREAK!"`, removed after 1500ms.
  - `major` — new `celebrateMajor(text)`: four gold rings, 120px start diameter, `border: 4px solid #ffd700`, `animation-delay` 0/90/180/270ms, 900ms duration; a gentle screen shake via a `celebrate-shake` class on `document.body` for 320ms (`@keyframes celebrate-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }`); a larger banner variant `.milestone-banner.major` (`font-size: 1.6rem`, `top: 30%`, background `rgba(40,30,0,0.96)`, stays 1800ms); a pulsing `box-shadow` flare on `#live-score` for 400ms (class `score-flare`). Does **not** pause the game and does **not** wait for a click.
  - `grand` — unchanged `celebrateTier3` from `src/utils/feedback.ts`, called from `src/App.tsx` at game end; add a `celebrateGrand` alias for naming consistency.

  **Haptics — extend `haptic` in `src/utils/feedback.ts`:**
  ```ts
  export const haptic = {
    correct:     () => vibrate(30),
    wrong:       () => vibrate([30, 40, 30]),
    milestone:   () => vibrate([60, 40, 60]),
    major:       () => vibrate([90, 40, 90, 40, 140]),   // new
    stageChange: () => vibrate(60),
    tap:         () => vibrate(10),
  };
  ```
  (`grand` already vibrates `[100, 50, 100]` inside `celebrateTier3` — leave it.)

  **`prefers-reduced-motion`:** add `const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;` at the top of `src/utils/feedback.ts`. When true, `celebrateTier1` / `celebrateTier2` / `celebrateMajor` skip creating ring elements and the `celebrate-shake`, keeping only the floating text / banner, with duration cut to 600ms and a fade-only entrance (no `scale`). Sounds and haptics are unaffected by reduced-motion.

  **Lifecycle / edge cases:**
  - Score off (`showScore === false`): no visual celebration and no `playStreakTone`; only `haptic.correct` + `playCorrectChime`.
  - Pause mid-round: celebrations are fire-and-forget with a `setTimeout` cleanup and are short (<1s), so they are not pause-aware.
  - Stop: elements live under `getContainer()`, which stays in the DOM; their removal `setTimeout` still runs — no leak.
  - `stat_longestStreakEver` is an emotional record, not scoped stats; default is to leave it out of "Clear History" (product decision — flip only if desired).
  - Streak 12 → 15 fires `major`; 16–19 fire `small`; 20 fires `major` again.

  **Files touched:** `src/hooks/useScoring.ts`, `src/hooks/useGameEngine.ts`, `src/utils/feedback.ts`, `src/index.css` (`celebrate-shake`, `.milestone-banner.major`, `.score-flare`, major rings, reduced-motion variants).
- **Adaptive timer** — tightens/relaxes based on streak, within a session.
- **Audio refinements** — single-note question sound, satisfying correct chime, escalating streak tone, optional background beats toggle.
- **Silent Mode** — visual-only questions, no audio.

  ### Implementation plan — Audio refinements + Silent Mode

  Single-note question sound (`playNoteSingle`) and the satisfying correct chime (`playCorrectChime`, a C-E-G major triad) already exist in `src/utils/audio.ts` / `src/utils/feedback.ts`. What is missing is the **escalating streak tone**, the **background beats toggle**, and **Silent Mode**. All Web Audio sounds follow the existing convention: a short oscillator burst through `getCtx()`, `gain.setValueAtTime` → `exponentialRampToValueAtTime`, times in seconds of `ctx.currentTime`.

  #### B1 — Escalating streak tone `playStreakTone(streak)` (new, `src/utils/feedback.ts`)

  Played **together with** `playCorrectChime` on every correct answer (the escalation is the point, so it is not gated to high streaks — but it stays silent below streak 3). Pitch steps up with the streak, mirroring `STREAK_TIERS`:

  | Streak | Note | Freq (Hz) | Waveform | Peak gain | Duration |
  |---|---|---|---|---|---|
  | 0–2 | — | (does not play; chime alone) | | | |
  | 3–4 | E5 | 659.25 | `triangle` | 0.06 | 0.10s |
  | 5–6 | G5 | 783.99 | `triangle` | 0.07 | 0.10s |
  | 7–9 | B5 | 987.77 | `triangle` | 0.08 | 0.11s |
  | 10–14 | D6 | 1174.66 | `triangle` | 0.09 | 0.12s |
  | 15–19 | E6 | 1318.51 | `triangle` | 0.10 | 0.12s |
  | 20+ | G6 | 1567.98 | `triangle` | 0.11 | 0.13s |

  ```ts
  export function playStreakTone(streak: number) {
    if (_silent) return;                       // see B3
    const step = STREAK_TONE_STEPS.find(s => streak >= s.min && streak <= s.max);
    if (!step) return;                          // streak < 3
    const ctx = getCtx(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = step.freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime + 0.04;          // 40ms after the chime onset, so attacks don't collide
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(step.gain, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + step.dur);
    osc.start(t); osc.stop(t + step.dur);
  }
  ```
  No need to update `_chimeEndTime`: the streak tone is shorter than `CHIME_TAIL` (0.4s) and is swallowed by it, so `correctChimeRemainingMs()` still covers it.

  #### B2 — Background beats toggle (new)

  **Asset:** `public/sounds/beat-loop.mp3` — a clean 1–2 bar loop (kick + hi-hat, ~90 BPM), 2–4s, normalised quiet. Loaded once and cached like `stick-click.mp3`. The service worker already precaches files under `sounds/`; confirm the pattern in `vite.config.ts` includes it.

  **`src/utils/audio.ts`:**
  ```ts
  let _beatBuffer: AudioBuffer | null = null;
  let _beatSource: AudioBufferSourceNode | null = null;
  let _beatGain: GainNode | null = null;

  export async function startBackgroundBeat() {
    if (_silent || _beatSource) return;
    const ctx = getAudioCtx();
    if (!_beatBuffer) _beatBuffer = await loadBeatBuffer(ctx);
    if (!_beatBuffer) return;
    _beatGain = ctx.createGain();
    _beatGain.gain.value = 0.14;               // low bed, doesn't compete with the question note
    _beatSource = ctx.createBufferSource();
    _beatSource.buffer = _beatBuffer;
    _beatSource.loop = true;
    _beatSource.connect(_beatGain);
    _beatGain.connect(ctx.destination);
    _beatSource.start();
  }

  export function stopBackgroundBeat() {
    try { _beatSource?.stop(); } catch { /* already stopped */ }
    _beatSource?.disconnect(); _beatGain?.disconnect();
    _beatSource = null; _beatGain = null;
  }

  export function pauseBackgroundBeat()  { if (_beatGain) _beatGain.gain.value = 0; }
  export function resumeBackgroundBeat() { if (_beatGain) _beatGain.gain.value = 0.14; }
  ```

  **Lifecycle in `src/App.tsx`:**
  - Preference: `const [backgroundBeats, setBackgroundBeats] = useState(() => loadSetting('pref_backgroundBeats', false));`
  - `start()`: if `backgroundBeats && !silentMode` → `startBackgroundBeat()`.
  - `stop()` (and game-end): `stopBackgroundBeat()`.
  - `pause()`: `pauseBackgroundBeat()`; `resume()`: `resumeBackgroundBeat()`.
  - Toggling mid-game: if `running`, start/stop immediately to match.

  **UI:** a new section in `settingsSections` (`src/App.tsx`), after `score`:
  ```
  id: 'beats'
  title: '🥁 Background beats'
  blurb: 'A quiet rhythm loop under the drill to keep your pace. Off by default. Muted automatically in Silent mode.'
  body: On/Off using notation-row + order-chip (like the Score section)
  ```
  When `silentMode` is on, the buttons get `chip-disabled` and do nothing.

  #### B3 — Silent Mode (new)

  **Shared module flag.** In both `src/utils/audio.ts` and `src/utils/feedback.ts`:
  ```ts
  let _silent = false;
  export function setSilent(v: boolean) { _silent = v; }
  ```
  - `src/utils/audio.ts`: early-return `if (_silent) return;` at the top of `playNote`, `playNoteSingle`, `playNoteSequence`, `beep`, `startBackgroundBeat`. When `setSilent(true)` is called while the beat loop is running, also call `stopBackgroundBeat()`.
  - `src/utils/feedback.ts`: early-return `if (_silent) return;` at the top of `playCorrectChime`, `playStreakTone`, and the tone sequence inside `celebrateTier3`. **Not** in `playClickSound` / `playToggleOn/Off` / `playStickClick` — those are UI sounds, not drill content; Silent Mode only concerns the drill's content audio.
  - `celebrateTier1/2/major/grand` visuals and haptics keep working in Silent Mode.

  With no sound in flight, `correctChimeRemainingMs()` / `soundRemainingMs()` return 0, so `advanceAfterSound` in `src/hooks/useGameEngine.ts` falls back to `minDelay` (the normal read-the-answer pauses). Fine.

  **Preference + wiring in `src/App.tsx`:**
  ```ts
  const [silentMode, setSilentMode] = useState(() => loadSetting('pref_silentMode', false));
  useEffect(() => {
    setAudioSilent(silentMode);
    setFeedbackSilent(silentMode);
  }, [silentMode]);
  ```
  (Two named imports, since `setSilent` is exported from both modules.)

  **UI:** a new section in `settingsSections`, after `score`:
  ```
  id: 'silent'
  title: '🔇 Silent mode'
  blurb: 'Visual-only questions — no note playback, chime or beats. Haptics and on-screen celebrations stay on. Great for practising with headphones off or a guitar in hand.'
  body: On/Off (notation-row + order-chip)
  ```
  Turning Silent Mode on visually disables the Background beats section.

  #### Interaction between the three audio pieces

  | Mode | Question note | Chime | Streak tone | Background beats | UI sounds | Haptics | Visual celebrations |
  |---|---|---|---|---|---|---|---|
  | Normal | ✓ | ✓ | ✓ (streak ≥3) | per toggle | ✓ | ✓ | per Score |
  | Score off | ✓ | ✓ | ✗ | per toggle | ✓ | ✓ | ✗ |
  | Silent Mode | ✗ | ✗ | ✗ | ✗ (stopped) | ✓ | ✓ | per Score |

  **Files touched:** `src/utils/feedback.ts`, `src/utils/audio.ts`, `src/App.tsx` (`pref_silentMode` + `pref_backgroundBeats`, `setSilent` effect, `start/stop/pause/resume` wiring, two new drawer sections), `vite.config.ts` (ensure `beat-loop.mp3` is precached), `public/sounds/beat-loop.mp3` (new asset).

  #### Suggested build order (both features)

  1. `setSilent` + Silent Mode (flag infrastructure, drawer section) — small, self-contained.
  2. Celebration tiers (`useScoring` + `useGameEngine` + `celebrateMajor` + CSS).
  3. `playStreakTone` — depends on the streak number from step 2.
  4. Background beats — largest (asset + pause/resume/stop lifecycle).
- **Mastery heatmap** on the note circle, colored by per-note/per-string success rate — fits the Selector model well since accuracy is already tracked per settings combination (`historyKey()`).
- **Progress chart** — accuracy % and avg response time trend across recent sessions.
- **Badges** — Speed Demon, Perfect Session, String Master, streak-based (e.g. 5-of-7 days), Most Improved — all computable from existing history data.

  ### Implementation plan — Badges

  **Data reality (what's actually stored today):**
  - `useHistory` keeps a flat `allHistory: Record<historyKey, HistoryEntry[]>` in localStorage (`selectorHistory`) and mirrors it to the cloud per account. `HistoryEntry = { note, fret, string, seconds, skipped, correct: boolean|null, id?, createdAt? }`. `createdAt` (ISO) exists only on rows recorded after id/timestamp stamping was added — older rows have none.
  - **Sessions are not delimited in stored history** — there is no "round" record, only a flat list of questions. Per-session facts (score, streak, accuracy) live only in `useScoring.session` in memory during a round, plus the per-`historyKey` `best_<key>` `PersonalBest` record (`{ score, streak, accuracy }`).
  - `src/utils/progress.ts` already derives, as pure functions over the flattened history: `dailyStats` (per calendar day: count, accuracy, avgSeconds — skips rows with no `createdAt`), `practiceStreak` (current/longest consecutive practice-day run), `lifetimeTotals` (totalQuestions, accuracy, avgSeconds, bestSeconds, daysPracticed), `weakNotes`.
  - The celebration-tiers plan adds a single-value key `stat_longestStreakEver`.

  Consequence: **session badges are evaluated at game-end going forward** (from `useScoring.session` + this round's `historyOps.history`) and then persisted as an earned record; they are not back-computed from flat history. **Lifetime badges** are pure functions over `allHistory` and are re-checked both at game-end and whenever the Stats screen opens (retroactive catch-up).

  **Instrument scoping:** lifetime badges operate on `historyForInstrument(allHistory, instrument.id)` (see the "Instrument-scoped all-time aggregation" plan in §1, which is built first). String/fret-shaped badges are therefore per-instrument: earning `full_neck` on guitar is separate from earning it on bass. Per-instrument earned records are keyed `"{badgeId}@{instrumentId}"` in the store for the instrument-scoped badges; session badges and the non-instrument lifetime badges (`century`, `week_warrior`, …) use the bare `badgeId`.

  #### Badge set

  **Session badges** — `evaluateSession({ questionsAnswered, maxQuestions, longestStreak, entries })`, where `maxQuestions` is the whole run's total (`totalRunQuestions(...)`, so Auto Advance multi-stage runs count as one) and `entries` is this round's rows:

  | id | Name | Icon | Condition |
  |---|---|---|---|
  | `perfect_session` | Perfect Session | 🎯 | `questionsAnswered >= 10` and every answered question is `correct === true` (no wrong, no timeout, no skip) |
  | `speed_demon` | Speed Demon | ⚡ | `>= 10` correct answers in the round, and `>= 8` of them with `seconds <= 1.5` |
  | `flawless_sprint` | Flawless Sprint | 🏁 | round ran to completion (`questionsAnswered === maxQuestions`) with round accuracy `>= 90%` |
  | `on_fire` | On Fire | 🔥 | `longestStreak >= 15` in the round |
  | `comeback` | Comeback | 💪 | `>= 3` misses (wrong+timeout) in the first half of the round, then finished with a closing streak `>= 8` |

  **Lifetime badges** — `evaluateLifetime({ allEntries, instrument })`, pure over the flattened `allHistory`:

  | id | Name | Icon | Condition | Progress target |
  |---|---|---|---|---|
  | `string_master_s{n}` | String Master · {string label} | 🎸 | on string `n`: `>= 40` answered questions **and** accuracy `>= 90%`. One badge per string of the current instrument — 6 for guitar (`s1`…`s6`), 4 for bass — generated from `instrument.stringLabels`. | 40 |
  | `string_master_all` | Full String Master | 🎸✨ | every `string_master_s{n}` for the current instrument is earned | n of stringCount |
  | `week_warrior` | Week Warrior | 📅 | some window of 7 consecutive calendar days contains `>= 5` distinct practice days (slide a 7-day window over `dailyStats` dates) | 5 |
  | `dedicated` | Dedicated | 🗓️ | `practiceStreak().longest >= 7` | 7 |
  | `century` | Century | 💯 | `lifetimeTotals.totalQuestions >= 100` | 100 |
  | `marathoner` | Marathoner | 🏆 | `lifetimeTotals.totalQuestions >= 1000` | 1000 |
  | `sharpshooter` | Sharpshooter | 🎯 | lifetime accuracy `>= 85%` over `>= 200` questions | 200 (gated) |
  | `most_improved` | Most Improved | 📈 | `daysPracticed >= 10` and mean accuracy of the latest 5 practice days `>=` mean accuracy of the earliest 5 practice days `+ 0.20` | — |
  | `full_neck` | Full Neck | 🛤️ | at least one answered question on **every** fret `0..instrument.maxFret` across all-time history | `maxFret + 1` |

  #### New module — `src/utils/badges.ts`

  ```ts
  // Fixed-identity badges. String Master is per-string and generated at
  // runtime from the instrument (`string_master_s1`…), so those ids are not
  // listed here.
  export type FixedBadgeId =
    | 'perfect_session' | 'speed_demon' | 'flawless_sprint' | 'on_fire' | 'comeback'
    | 'string_master_all' | 'week_warrior' | 'dedicated' | 'century' | 'marathoner'
    | 'sharpshooter' | 'most_improved' | 'full_neck';
  export type BadgeId = FixedBadgeId | `string_master_s${number}`;

  export type BadgeKind = 'session' | 'lifetime';

  export interface BadgeDef {
    id: BadgeId;
    name: string;
    icon: string;
    blurb: string;           // one line: how to earn it
    kind: BadgeKind;
    instrumentScoped: boolean; // true → stored/earned per instrument
    target?: number;         // for the locked-state progress bar
  }
  // The fixed defs; the per-string String Master defs are produced by
  // stringMasterBadges(instrument) and concatenated by badgeList(instrument).
  export const FIXED_BADGES: readonly BadgeDef[];
  export function stringMasterBadges(instrument: InstrumentConfig): BadgeDef[];
  export function badgeList(instrument: InstrumentConfig): BadgeDef[];

  export interface EarnedBadge { earnedAt: string; }        // ISO
  // Store key: bare `badgeId` for non-instrument badges, `"{badgeId}@{instrumentId}"`
  // for instrument-scoped ones. localStorage key: 'badges'.
  export type BadgeStore = Record<string, EarnedBadge>;

  export function loadBadges(): BadgeStore;
  export function isEarned(id: BadgeId, instrumentId?: string): boolean;
  export function awardBadge(id: BadgeId, instrumentId?: string): boolean;  // true only if NEWLY earned

  export interface SessionSnapshot {
    questionsAnswered: number;
    maxQuestions: number;
    longestStreak: number;
    entries: HistoryEntry[];
    instrument: InstrumentConfig;
  }
  export interface LifetimeSnapshot {
    instrumentEntries: HistoryEntry[];   // already filtered via historyForInstrument
    instrument: InstrumentConfig;
  }
  export function evaluateSession(s: SessionSnapshot): BadgeId[];
  export function evaluateLifetime(l: LifetimeSnapshot): BadgeId[];
  export function badgeProgress(
    id: BadgeId, l: LifetimeSnapshot,
  ): { current: number; target: number } | null;
  ```
  `evaluateSession` returns only non-instrument-scoped ids plus, where relevant, none that are instrument-scoped (session badges are not instrument-scoped in v1). `evaluateLifetime` returns instrument-scoped ids; the caller passes `l.instrument.id` to `awardBadge`. `string_master_all` is derived: `evaluateLifetime` includes it when every `string_master_s{n}` for `l.instrument` is already earned (or earned in this same pass).

  Storage is local-only for v1, following `stat_longestStreakEver`. Cloud write-through (a `badges` table alongside `best_<key>`, plus merge on sign-in in `src/utils/sync.ts`) is a **phase 2** follow-up, noted here, not built now.

  #### Wiring

  **`src/App.tsx` — game-end effect (the `wasRunningRef` block, ~line 652):** after the personal-best branch, build a `SessionSnapshot` (`scoring.session.questionsAnswered`, `totalRunQuestions(selector.state.difficulty, selector.state.autoAdvance)`, `scoring.session.longestStreak`, `historyOps.history`, `instrument`) and a `LifetimeSnapshot` (`historyForInstrument(historyOps.allHistory, instrument.id)`, `instrument`). Call `evaluateSession` + `evaluateLifetime`; for each returned id call `awardBadge(id, instrument.id)` and collect the ones that come back `true` into a new `newBadges` state array. Guard with a `badgesFiredRef` like `tier3FiredRef` so a re-run of the effect doesn't double-fire.

  **Game-end summary card (~line 1233):** when `newBadges.length > 0`, render a row per newly earned badge — `🏅 New badge · {name}`. Fire one `celebrateTier2(`🏅 ${name of newBadges[0]}`)` (or a dedicated `celebrateBadge`, gold, same ring+banner language) — **gated on `showScore`** like every other celebration, and it inherits the `prefers-reduced-motion` handling from the celebration-tiers plan. Awarding itself is **not** gated — badges accrue in Silent Mode / Score-off.

  **Home of the badge grid — the Account section (`src/App.tsx`, `settingsSections` id `account`, ~line 924):** render a **Badges** block inside the Account section body, shown in both the signed-in and signed-out states (below the sign-in / sign-out card). Because that section only exists when `auth.configured`, also register a standalone always-present drawer section **`🏅 Badges`** (id `badges`) right after `account` whose body is the same `<BadgeGrid>` component — the Account block and the standalone section share one component. Add a one-line earned summary (`🏅 7 / 21`) to the Account card header.
  - `<BadgeGrid instrument={instrument} />`: on mount, run `evaluateLifetime` once over `historyForInstrument(allHistory, instrument.id)` and `awardBadge` any that qualify (retroactive catch-up). Then render `badgeList(instrument)` as a responsive grid. Earned → full-colour tile: icon, name, `earnedAt` date. Locked → greyed tile; if `badgeProgress` returns a value, a thin bar `current / target`. Instrument-scoped badges show the current instrument's state; a small caption notes "for {instrument label}".
  - `src/index.css`: add `.badge-grid`, `.badge-tile`, `.badge-tile.locked`, `.badge-progress`, reusing the `SettingCard` / drawer-page styling.
  - The Stats screen (`ProgressPanel`) does **not** get the grid; it may keep a single hero-tile "🏅 {earned count}" that deep-links to the Badges section. Optional, low priority.

  #### Lifecycle / edge cases

  - Badges are achievements: by default **not** wiped by "Clear history" / "Clear all history" (consistent with `stat_longestStreakEver`). Flip only on an explicit product call.
  - Score off / Silent Mode: badges are still evaluated and awarded; only the game-end badge *celebration* is suppressed (it's a `showScore` effect).
  - Auto Advance run: one run = one session evaluation; `maxQuestions` = summed run total so `flawless_sprint` means the whole run.
  - Legacy rows without `createdAt`: day-based badges (`week_warrior`, `dedicated`, `most_improved`) skip them (same as `dailyStats`); count-based badges (`century`, `marathoner`, `full_neck`, `string_master_s{n}`) include them.
  - Instrument-scoped badges depend on the §1 "Instrument-scoped all-time aggregation" work landing first (`historyForInstrument`). `string_master_s{n}` / `string_master_all` / `full_neck` are tracked separately per instrument via the `"{badgeId}@{instrumentId}"` store key, so a new string instrument added later automatically gets its own set with no code change.
  - `most_improved` needs `daysPracticed >= 10` to avoid rewarding two-day noise.
  - Re-award safety: `awardBadge` is idempotent — writes `earnedAt` only on first earn, returns `false` afterwards, so the "new badge" celebration never repeats.

  #### Files touched

  | File | Change |
  |---|---|
  | `src/utils/badges.ts` | **new** — `BADGES`, store load/award, `evaluateSession` / `evaluateLifetime` / `badgeProgress` |
  | `src/App.tsx` | game-end effect: build snapshots, evaluate, `awardBadge`, `newBadges` state + `badgesFiredRef`; game-end summary card: new-badge rows + `celebrateTier2` |
  | `src/App.tsx` | `settingsSections`: Badges block in the `account` section + standalone `badges` section; shared `<BadgeGrid>` component; earned-count line on the Account card |
  | `src/components/BadgeGrid.tsx` | **new** — mount-time lifetime catch-up + the responsive badge grid |
  | `src/index.css` | `.badge-grid`, `.badge-tile`, `.badge-tile.locked`, `.badge-progress` |
  | `src/utils/feedback.ts` | *(optional)* `celebrateBadge` alias over the Tier-2 visual |

  Phase 2 (separate): cloud sync for the `badges` store in `src/utils/sync.ts` + merge on sign-in.

  #### Build order

  0. **Prerequisite:** the §1 "Instrument-scoped all-time aggregation" task (`historyForInstrument`).
  1. `src/utils/badges.ts` — `FIXED_BADGES` + `stringMasterBadges` / `badgeList`, store (`loadBadges` / `isEarned` / `awardBadge` with the `@instrument` key convention).
  2. `evaluateLifetime` + `badgeProgress`, and `<BadgeGrid>` in the Account + standalone `badges` drawer sections (visible immediately from existing history via mount-time catch-up).
  3. `evaluateSession` + the game-end wiring in `App.tsx` (snapshots, `awardBadge`, `newBadges`).
  4. Game-end summary rows + `celebrateTier2` badge celebration + CSS polish.
- **Practice schedule / reminders** — local notification at a chosen time, gentle streak counter.
- **Adaptive suggestion, retargeted** — auto-suggest a harder/easier Selector configuration (fret range or difficulty) based on recent accuracy for the current settings combination. This keeps the *intent* of the old "adaptive suggestion between stages" idea while dropping the Stage mechanism itself.

---

## 4. Unconfirmed Ideas
Old-roadmap ideas that may still have value but were never re-affirmed under the Selector model. None of these should be scheduled without a product-owner decision.

- **Saved/named Selector presets.** The old "Custom Stage" (save/rename/clear, free-tier limit of 1) doesn't apply directly since there's no Stage to snapshot — but a lighter equivalent (bookmark a specific string+range+difficulty+mode combo for quick recall) might still be wanted. Unconfirmed whether this is desired at all, and if so, whether a free-tier limit is even relevant pre-monetization.
- **Multi-string emphasis animations** (string label flash/scale on switch, haptic pulse on string switch) — plausible polish for multi-string mode, but not confirmed as a priority; usage of multi-string mode isn't yet established as common enough to warrant it.
- **Quick-switch affordance for recent/favorite Selector combinations** — distinct from reviving Stage navigation, but unconfirmed whether users need anything beyond directly editing the Selector Panel each time.
- **Auth & cross-device sync** (Google sign-in, Supabase) — plausible long-term, but the app is intentionally backend-free today; no decision has been made to introduce a backend.
- **Leaderboard, expertise tests (String Speed Test, Full Neck Sprint, Blind Ear Test), user profiles, admin dashboard** — all depend on the unconfirmed backend decision above.
- **Monetization** (premium tier, ad-unlock, donations, community donation pool) — depends on both the backend decision and a separate, unmade business decision to monetize at all.
- **Walk Mode / hands-free voice drilling, ear training, additional instruments (bass, ukulele, mandolin, banjo), iOS port** — all plausible long-term directions from the later original roadmap, none rejected, none confirmed; each represents a significant scope commitment that hasn't been revisited under the current product direction.

---

## 5. Obsolete
Only items clearly and specifically superseded by the Selector model — not "deprioritized," but actually replaced by a shipped, different mechanism.

- **Stage progression system** (dots → natural → chromatic per string, moved through in sequence) — replaced by direct difficulty selection (Whole Only / Dot Frets / +♯♭) in the Selector Panel; there is no discrete sequence to progress through anymore.
- **Stage Navigation chrome** — chevron arrows, progress bar with per-string colored dashes, tap-title stage picker overlay, title glow on stage change, swipe-to-change-stage, "stage change always stops game." All of this assumed a stage index to navigate; the Selector Panel has no equivalent concept and none of this UI should be rebuilt in its original form.
- **"Custom Stage" as a stage-snapshot concept specifically** — the *mechanism* (snapshotting a Stage) is obsolete along with Stages themselves. (The underlying *want* — save a configuration for later — is carried forward as an Unconfirmed idea above, not as this obsolete mechanism.)
